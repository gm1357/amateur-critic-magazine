import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { CONTENTS_PATH, reviewPath } from '../../src/pages';
import { folioOf, openAt } from './issue';
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

// Which spread is open, as a number. Turns are asserted as moves from wherever the issue
// happened to open — the issue typesets itself, so an article that ran over has already
// moved every spread that comes after it.
function spreadAt(book: Element): number {
  return Number(book.getAttribute('data-spread'));
}

function pageOf(container: HTMLElement) {
  return container.querySelector('.a4-leaf')!.getBoundingClientRect();
}

test('a finger turns the page from anywhere on it, not only from the edge', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const from = spreadAt(book);
  const middle = { x: paper.left + paper.width * 0.7, y: paper.top + paper.height * 0.18 };

  await swipe(middle, { x: middle.x - paper.width * 0.65, y: middle.y });

  await expect.poll(() => spreadAt(book)).toBe(from + 1);
  expect(openAt(screen.container)).not.toContain(CONTENTS_PATH);
});

test('swiping the other way turns back', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const from = spreadAt(book);
  const middle = { x: paper.left + paper.width * 0.3, y: paper.top + paper.height * 0.75 };

  await swipe(middle, { x: middle.x + paper.width * 0.65, y: middle.y });

  await expect.poll(() => spreadAt(book)).toBe(from - 1);

  // Whatever is behind the first review is the end of the listing that pointed at it.
  expect(openAt(screen.container).every((page) => page.startsWith(CONTENTS_PATH))).toBe(true);
});

// A page is not turned out from under a finger that was going somewhere else.
test('a finger moving down the page does not turn it', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const from = spreadAt(book);
  const middle = { x: paper.left + paper.width * 0.5, y: paper.top + paper.height * 0.3 };

  await swipe(middle, { x: middle.x - 12, y: middle.y + paper.height * 0.4 });

  expect(book.getAttribute('data-phase')).toBe('rest');
  expect(screen.container.querySelector('.leaf-turn')).toBeNull();
  expect(spreadAt(book)).toBe(from);
});

// A touch resolves its touch-action from what it landed on up to that element's scroll
// container, so the declaration on the leaf is not on its own enough to reach a finger
// inside the page. Left to `auto`, the browser claims any touch that travels far enough —
// in either direction — and sends `pointercancel`, which lands every swipe back where it
// started. Synthetic pointer events are never cancelled that way, so nothing else here
// would notice.
test('the page body leaves vertical panning to the browser, and only vertical', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const leaf = screen.container.querySelector('.a4-leaf')!;
  const body = leaf.querySelector('.leaf-page')!;

  expect(getComputedStyle(leaf).touchAction).toBe('pan-y');
  expect(getComputedStyle(body).touchAction).toBe('pan-y');
});

// Most of the contents is links. Refusing to turn from them would leave that page nearly
// unswipeable, so a swipe wins over the entry it began on — and the click it would
// otherwise fire is swallowed, rather than following the link as well.
test('a finger that starts on a contents entry still turns the page', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = spreadAt(book);
  const link = centreOf(screen.getByRole('link', { name: reviews[3].movie }).element());

  await swipe(link, { x: link.x - pageOf(screen.container).width * 0.7, y: link.y });

  await expect.poll(() => spreadAt(book)).toBe(from + 1);
  expect(openAt(screen.container)).not.toContain(reviewPath(reviews[3].slug));
});

// A tap is a swipe that went nowhere, so the entry has to still be followable.
test('tapping a contents entry still follows it', async () => {
  const screen = await renderAt(CONTENTS_PATH);

  await screen.getByRole('link', { name: reviews[3].movie }).click();

  await expect.poll(() => openAt(screen.container)).toContain(reviewPath(reviews[3].slug));
  await expect
    .element(screen.getByRole('heading', { level: 1, name: reviews[3].movie }))
    .toBeVisible();
});

// The swallowed click must not outlive the swipe that swallowed it.
test('a swipe does not swallow the click that comes after it', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const from = spreadAt(book);
  const middle = { x: paper.left + paper.width * 0.5, y: paper.top + paper.height * 0.18 };

  await swipe(middle, { x: middle.x - paper.width * 0.7, y: middle.y });
  await expect.poll(() => spreadAt(book)).toBe(from + 1);

  await screen.getByRole('link', { name: 'Previous' }).click();

  await expect.poll(() => spreadAt(book)).toBe(from);
});

test('there is nothing to swipe onto before the cover', async () => {
  const screen = await renderAt('/');
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const middle = { x: paper.left + paper.width * 0.3, y: paper.top + paper.height * 0.5 };

  await swipe(middle, { x: middle.x + paper.width * 0.6, y: middle.y });

  expect(spreadAt(book)).toBe(0);
  expect(folioOf(screen.container)).toBe('1');
});

// A mouse has the page edge, which is a more precise instrument and a less accidental one.
test('a mouse dragged across the middle of the page does not turn it', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const paper = pageOf(screen.container);
  const from = spreadAt(book);
  const middle = { x: paper.left + paper.width * 0.7, y: paper.top + paper.height * 0.75 };

  const { drag } = await import('./pointer');
  await drag(middle, { x: middle.x - paper.width * 0.65, y: middle.y });

  expect(spreadAt(book)).toBe(from);
});
