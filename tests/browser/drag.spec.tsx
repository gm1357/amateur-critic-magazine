import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { CONTENTS_PATH, pages, reviewPath } from '../../src/pages';
import { cancel, centreOf, drag } from './pointer';

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

function zoneOf(container: HTMLElement, which: 'next' | 'previous') {
  const zone = container.querySelector(`[data-turn-zone="${which}"]`);
  if (!zone) throw new Error(`no ${which} edge to take hold of`);
  return zone;
}

// The distance across a leaf, which is what a drag's progress is measured against.
function leafWidth(container: HTMLElement) {
  return container.querySelector('.a4-leaf')!.getBoundingClientRect().width;
}

test('dragging the page edge most of the way across turns the page', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.8, y: grip.y });

  await expect.poll(() => book.getAttribute('data-spread')).toBe('2');
  await expect
    .element(screen.getByRole('heading', { level: 1, name: reviews[0].movie }))
    .toBeVisible();
});

test('a page let go of before halfway falls back', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.2, y: grip.y });

  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  expect(book.getAttribute('data-spread')).toBe('1');
  await expect.element(screen.getByText(`2 / ${pages.length}`)).toBeVisible();
});

test('the leaf follows the hand while it is held', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const held = await drag(
    grip,
    { x: grip.x - leafWidth(screen.container) * 0.5, y: grip.y },
    {
      release: false,
    },
  );

  expect(book.getAttribute('data-phase')).toBe('drag');
  // Half a leaf dragged is half a turn: ninety degrees, written straight to the node.
  const leaf = screen.container.querySelector('.leaf-turn')! as HTMLElement;
  expect(Number.parseFloat(leaf.style.getPropertyValue('--flip-angle'))).toBeCloseTo(-90, 0);

  // Put the pointer down again so the gesture does not outlive the test.
  cancel(held, grip);
});

test('the edge can be taken hold of in either direction', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'previous'));

  await drag(grip, { x: grip.x + leafWidth(screen.container) * 0.8, y: grip.y });

  await expect.poll(() => book.getAttribute('data-spread')).toBe('1');
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();
});

// The browser sends this when it decides the gesture was really someone else's.
test('a cancelled gesture drops the page rather than turning it', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const held = await drag(
    grip,
    { x: grip.x - leafWidth(screen.container) * 0.9, y: grip.y },
    {
      release: false,
    },
  );
  cancel(held, grip);

  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  expect(book.getAttribute('data-spread')).toBe('1');
});

test('the cover has no edge to turn back from, and the last page none to turn forward', async () => {
  const cover = await renderAt('/');
  expect(cover.container.querySelector('[data-turn-zone="previous"]')).toBeNull();
  expect(cover.container.querySelector('[data-turn-zone="next"]')).not.toBeNull();

  const end = await renderAt(reviewPath(reviews[reviews.length - 1].slug));
  expect(end.container.querySelector('[data-turn-zone="next"]')).toBeNull();
});

test('on a wide desk a drag turns a whole leaf, both pages of it', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.8, y: grip.y });

  await expect.poll(() => book.getAttribute('data-spread')).toBe('2');
  await expect.element(screen.getByText(`4–5 / ${pages.length}`)).toBeVisible();
});

// Real input, through the browser's own hit-testing and event ordering, rather than
// events this suite constructed for itself.
test('a real pointer drag turns the page as well', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);

  await userEvent.dragAndDrop(
    zoneOf(screen.container, 'next'),
    screen.container.querySelector('[data-page]')!,
    // `force` because the leaf being dragged is under the cursor and would fail the drop
    // target's hit test; `steps` because the default is a single move, which is a
    // degenerate drag with no travel to measure; `targetPosition` because the middle of
    // the page is exactly the halfway line, and a test should not sit on it.
    { force: true, steps: 12, targetPosition: { x: 4, y: 120 } },
  );

  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  expect(book.getAttribute('data-spread')).toBe('2');
});
