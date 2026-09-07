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
