import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { CONTENTS_PATH, pages, reviewPath } from '../../src/pages';
import { centreOf, swipe } from './pointer';

// The pinned viewport is a phone, which is where a finger reads the issue.
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

function pageOf(container: HTMLElement) {
  return container.querySelector('.a4-leaf')!.getBoundingClientRect();
}

test('a finger turns the page from anywhere on it, not only from the edge', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const middle = { x: paper.left + paper.width * 0.7, y: paper.top + paper.height * 0.18 };

  await swipe(middle, { x: middle.x - paper.width * 0.65, y: middle.y });

  await expect.poll(() => book.getAttribute('data-spread')).toBe('2');
  await expect
    .element(screen.getByRole('heading', { level: 1, name: reviews[0].movie }))
    .toBeVisible();
});

test('swiping the other way turns back', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const middle = { x: paper.left + paper.width * 0.3, y: paper.top + paper.height * 0.75 };

  await swipe(middle, { x: middle.x + paper.width * 0.65, y: middle.y });

  await expect.poll(() => book.getAttribute('data-spread')).toBe('1');
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();
});

// The page a reader is scrolling must not turn itself out from under them.
test('a finger moving down the page scrolls it rather than turning it', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const middle = { x: paper.left + paper.width * 0.5, y: paper.top + paper.height * 0.3 };

  await swipe(middle, { x: middle.x - 12, y: middle.y + paper.height * 0.4 });

  expect(book.getAttribute('data-phase')).toBe('rest');
  expect(screen.container.querySelector('.leaf-turn')).toBeNull();
  expect(book.getAttribute('data-spread')).toBe('2');
});

// The scroller is the load-bearing one, and it is the one this suite cannot otherwise
// reach: a touch resolves its touch-action from what it landed on up to that element's
// scroll container, so the leaf's `pan-y` never applies to a finger inside the page. Left
// to `auto`, the browser claims any touch that travels far enough — in either direction —
// and sends `pointercancel`, which lands every swipe back where it started. Synthetic
// pointer events are never cancelled that way, so nothing else here would notice.
test('the page body leaves vertical scrolling to the browser, and only vertical', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const leaf = screen.container.querySelector('.a4-leaf')!;
  const scroller = leaf.querySelector('.leaf-scroll')!;

  expect(getComputedStyle(leaf).touchAction).toBe('pan-y');
  expect(getComputedStyle(scroller).touchAction).toBe('pan-y');
});

// Most of the contents is links. Refusing to turn from them would leave that page nearly
// unswipeable, so a swipe wins over the entry it began on — and the click it would
// otherwise fire is swallowed, rather than following the link as well.
test('a finger that starts on a contents entry still turns the page', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const link = centreOf(screen.getByRole('link', { name: reviews[3].movie }).element());

  await swipe(link, { x: link.x - pageOf(screen.container).width * 0.7, y: link.y });

  await expect.poll(() => book.getAttribute('data-spread')).toBe('2');
  await expect
    .element(screen.getByRole('heading', { level: 1, name: reviews[0].movie }))
    .toBeVisible();
});

// A tap is a swipe that went nowhere, so the entry has to still be followable.
test('tapping a contents entry still follows it', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);

  await screen.getByRole('link', { name: reviews[3].movie }).click();

  await expect.poll(() => book.getAttribute('data-spread')).toBe('5');
  await expect
    .element(screen.getByRole('heading', { level: 1, name: reviews[3].movie }))
    .toBeVisible();
});

// The swallowed click must not outlive the swipe that swallowed it.
test('a swipe does not swallow the click that comes after it', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const middle = { x: paper.left + paper.width * 0.5, y: paper.top + paper.height * 0.18 };

  await swipe(middle, { x: middle.x - paper.width * 0.7, y: middle.y });
  await expect.poll(() => book.getAttribute('data-spread')).toBe('2');

  await screen.getByRole('link', { name: 'Previous' }).click();

  await expect.poll(() => book.getAttribute('data-spread')).toBe('1');
});

test('there is nothing to swipe onto before the cover', async () => {
  const screen = await renderAt('/');
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const middle = { x: paper.left + paper.width * 0.3, y: paper.top + paper.height * 0.5 };

  await swipe(middle, { x: middle.x + paper.width * 0.6, y: middle.y });

  expect(book.getAttribute('data-spread')).toBe('0');
  await expect.element(screen.getByText(`1 / ${pages.length}`)).toBeVisible();
});

// A mouse has the page edge, which is a more precise instrument and a less accidental one.
test('a mouse dragged across the middle of the page does not turn it', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const middle = { x: paper.left + paper.width * 0.7, y: paper.top + paper.height * 0.75 };

  const { drag } = await import('./pointer');
  await drag(middle, { x: middle.x - paper.width * 0.65, y: middle.y });

  expect(book.getAttribute('data-spread')).toBe('1');
});
