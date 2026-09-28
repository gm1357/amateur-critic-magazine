import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH } from '../../src/pages';
import { folioOf, openAt } from './issue';

const DESK = { width: 1280, height: 800 };
const viewport = { width: window.innerWidth, height: window.innerHeight };

afterEach(async () => {
  await page.viewport(viewport.width, viewport.height);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function bookOf(container: HTMLElement) {
  const book = container.querySelector('[data-spread]');
  if (!book) throw new Error('the issue is not open');
  return book;
}

function turningLeafOf(container: HTMLElement) {
  return container.querySelector('.leaf-turn');
}

test('a page turn puts a leaf in the air and lands it on the next spread', async () => {
  const screen = await renderAt('/');
  const book = bookOf(screen.container);

  await screen.getByRole('link', { name: 'Next' }).click();

  await expect.poll(() => book.getAttribute('data-spread')).toBe('1');
  expect(book.getAttribute('data-phase')).toBe('rest');
  expect(turningLeafOf(screen.container)).toBeNull();
});

// The turning leaf carries a whole page, headings and all. Left visible to the role
// engine it would put two of every page on screen for as long as the turn lasts.
test('the leaf in the air is not a second copy of the page', async () => {
  const screen = await renderAt('/');
  const book = bookOf(screen.container);

  await screen.getByRole('link', { name: 'Next' }).click();
  await expect.poll(() => book.getAttribute('data-phase')).toBe('animate');

  const leaf = turningLeafOf(screen.container)!;
  expect(leaf.getAttribute('aria-hidden')).toBe('true');
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();
});

// If any grouping property reached the turning leaf, `preserve-3d` would compute to flat
// and the turn would render as a horizontal squash instead of a rotation.
test('the leaf really turns in three dimensions', async () => {
  const screen = await renderAt('/');
  const book = bookOf(screen.container);

  await screen.getByRole('link', { name: 'Next' }).click();
  await expect.poll(() => book.getAttribute('data-phase')).toBe('animate');

  const leaf = turningLeafOf(screen.container)!;
  expect(getComputedStyle(leaf).transformStyle).toBe('preserve-3d');
  expect(getComputedStyle(book).perspective).not.toBe('none');

  // A rotateY resolves to a 4x4 matrix; a flattened one collapses to matrix().
  await expect.poll(() => getComputedStyle(leaf).transform).toMatch(/^matrix3d\(/);
});

test('the paper carries no transform once the leaf has come down', async () => {
  const screen = await renderAt('/');
  const book = bookOf(screen.container);

  await screen.getByRole('link', { name: 'Next' }).click();
  await expect.poll(() => book.getAttribute('data-spread')).toBe('1');

  expect(getComputedStyle(book).perspective).toBe('none');
});

test('the arrow keys turn the page too', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = Number(book.getAttribute('data-spread'));
  const open = openAt(screen.container);

  await userEvent.keyboard('{ArrowRight}');

  // One leaf on, and neither of the pages that were open is still on the desk.
  await expect.poll(() => Number(book.getAttribute('data-spread'))).toBe(from + 1);
  expect(openAt(screen.container).some((path) => open.includes(path))).toBe(false);
});

test('turning back closes the book onto the cover', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);

  await userEvent.keyboard('{ArrowLeft}');

  await expect.poll(() => book.getAttribute('data-spread')).toBe('0');
  await expect
    .element(screen.getByRole('heading', { level: 1, name: 'Amateur Critic Magazine' }))
    .toBeVisible();
});

// A contents entry can be several spreads ahead. It is still one leaf: the turn only ever
// refers to the two spreads at the ends of the jump.
test('a contents entry several pages ahead is still one turn', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const last = reviews[reviews.length - 1];
  const from = book.getAttribute('data-spread')!;

  // Every value the book takes, rather than every value a poll happened to catch: how far
  // the back of the issue is from the contents depends on how much paper the reviews in
  // between took, so what is asserted is the shape of the journey, not its length.
  const seen = new Set<string>([from]);
  const watch = new MutationObserver(() => seen.add(book.getAttribute('data-spread')!));
  watch.observe(book, { attributeFilter: ['data-spread'], attributes: true });

  await screen.getByRole('link', { name: last.movie }).click();
  await expect.element(screen.getByRole('heading', { level: 1, name: last.movie })).toBeVisible();
  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  watch.disconnect();

  const destination = book.getAttribute('data-spread')!;

  // One turn, not several: the issue was on the spread it left, and then on the spread it
  // arrived at, never on any of the ones in between.
  expect(Number(destination)).toBeGreaterThan(Number(from) + 1);
  expect([...seen].sort()).toEqual([from, destination].sort());
});

test('paging to the end and back again leaves the issue where it started', async () => {
  const screen = await renderAt('/');
  const book = bookOf(screen.container);

  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => book.getAttribute('data-spread')).toBe('1');
  await userEvent.keyboard('{ArrowLeft}');
  await expect.poll(() => book.getAttribute('data-spread')).toBe('0');

  expect(folioOf(screen.container)).toBe('1');
  expect(openAt(screen.container)).toEqual(['/']);
});

test('the last page has nothing to turn onto', async () => {
  const screen = await renderAt(BACK_PATH);
  const book = bookOf(screen.container);
  const spread = book.getAttribute('data-spread');

  await userEvent.keyboard('{ArrowRight}');

  expect(book.getAttribute('data-spread')).toBe(spread);
  expect(turningLeafOf(screen.container)).toBeNull();
});

// On a desk that runs out of height, a leaf in the air projects well past the top and
// bottom of the book. Let that reach the document and it grows a scrollbar mid-turn, the
// desk narrows by the width of it, and the whole issue is typeset again under the reader.
test('a leaf in the air never gives the page a scrollbar', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const root = document.documentElement;

  await screen.getByRole('link', { name: 'Next' }).click();
  await expect.poll(() => book.getAttribute('data-phase')).toBe('animate');

  // Bounded, so a turn that never lands fails the assertion below rather than the timeout.
  let overflowed = false;
  for (let frame = 0; frame < 120 && book.getAttribute('data-phase') === 'animate'; frame++) {
    overflowed ||= root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth;
    await new Promise(requestAnimationFrame);
  }
  expect(overflowed).toBe(false);
});

// A desk that changes size mid-turn re-cuts the issue under the leaf in the air. Whatever
// that does to the turn, the book must still come to rest on the page the URL names —
// taking the leaf out of the air without also putting the book down left it stranded
// mid-turn, with the pager reading one spread and the desk showing another.
//
// The book is looked up afresh each time: while the issue is being counted again, a URL
// on a continued page is not yet a page of it, and the book is put away until it is.
test('a desk resized mid-turn still brings the leaf down', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  const from = Number(bookOf(screen.container).getAttribute('data-spread'));

  await screen.getByRole('link', { name: 'Next' }).click();
  await expect.poll(() => bookOf(screen.container).getAttribute('data-phase')).toBe('animate');
  await page.viewport(DESK.width - 15, DESK.height);

  await expect
    .poll(() => screen.container.querySelector('[data-spread]')?.getAttribute('data-phase'))
    .toBe('rest');
  expect(Number(bookOf(screen.container).getAttribute('data-spread'))).toBe(from + 1);
});
