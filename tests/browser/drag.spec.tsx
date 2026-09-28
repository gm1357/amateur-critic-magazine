import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, reviewPath } from '../../src/pages';
import { folioOf, openAt } from './issue';
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

// Which spread is open, as a number. Turns are asserted as moves from wherever the issue
// happened to open: it typesets itself, so an article that ran over has already moved
// every spread that comes after it.
function spreadAt(book: Element): number {
  return Number(book.getAttribute('data-spread'));
}

test('dragging the page edge most of the way across turns the page', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = spreadAt(book);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.8, y: grip.y });

  await expect.poll(() => spreadAt(book)).toBe(from + 1);
  expect(openAt(screen.container)).not.toContain(CONTENTS_PATH);
});

test('a page let go of before halfway falls back', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  // A step a frame, so how fast this drag is depends on the frame rate. Twelve steps came
  // to a leaf a second at 60Hz — close enough to a flick that a few early frames threw
  // the page over. Forty-eight keep it a slow placement at any rate a browser will run.
  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.2, y: grip.y }, { steps: 48 });

  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  expect(openAt(screen.container)).toEqual([CONTENTS_PATH]);
  expect(folioOf(screen.container)).toBe('2');
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
  const from = spreadAt(book);
  const grip = centreOf(zoneOf(screen.container, 'previous'));

  await drag(grip, { x: grip.x + leafWidth(screen.container) * 0.8, y: grip.y });

  await expect.poll(() => spreadAt(book)).toBe(from - 1);
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
  expect(openAt(screen.container)).toEqual([CONTENTS_PATH]);
});

test('the cover has no edge to turn back from, and the back cover none to turn forward', async () => {
  const cover = await renderAt('/');
  expect(cover.container.querySelector('[data-turn-zone="previous"]')).toBeNull();
  expect(cover.container.querySelector('[data-turn-zone="next"]')).not.toBeNull();

  const end = await renderAt(BACK_PATH);
  expect(end.container.querySelector('[data-turn-zone="next"]')).toBeNull();
});

test('on a wide desk a drag turns a whole leaf, both pages of it', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = spreadAt(book);
  const open = openAt(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.8, y: grip.y });

  // One turn past both pages that were open, and the pager prints the range it landed on.
  await expect.poll(() => spreadAt(book)).toBe(from + 1);
  expect(openAt(screen.container)).toHaveLength(2);
  expect(openAt(screen.container).some((path) => open.includes(path))).toBe(false);
  expect(folioOf(screen.container)).toMatch(/^\d+–\d+$/);
});

// Real input, through the browser's own hit-testing and event ordering, rather than
// events this suite constructed for itself.
test('a real pointer drag turns the page as well', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = spreadAt(book);

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
  expect(spreadAt(book)).toBe(from + 1);
});

// A leaf let go of past halfway carries on from where the hand left it. The bug this
// guards against was the URL arriving a commit after the state that starts the settle,
// which read as the reader asking for a different page and restarted the turn from flat:
// the paper snapped back to the desk and turned again, over the full duration.
test('a released leaf carries on from where it was let go, never from flat', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));
  const watch = track(book);

  // Stopped whatever happens: a sampler left running would keep asking the browser for a
  // frame for the rest of the suite.
  let angles: number[];
  try {
    await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.7, y: grip.y });
    await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
    angles = watch.angles;
  } finally {
    watch.stop();
  }

  // A forward turn only ever goes one way. Anything else is the leaf being put back.
  expect(angles.at(-1)).toBeCloseTo(-180, 0);
  for (const [step, angle] of angles.entries()) {
    if (step > 0) expect(angle).toBeLessThanOrEqual(angles[step - 1] + 0.5);
  }
});

// The leaf's angle, read back off the composited matrix rather than off the custom
// property, because the settle is a Web Animation and does not write that property.
function angleOf(transform: string): number | undefined {
  if (!transform.startsWith('matrix3d')) return transform === 'none' ? undefined : 0;
  const cells = transform.slice(9, -1).split(',').map(Number);
  return (Math.atan2(-cells[2], cells[0]) * 180) / Math.PI;
}

function track(book: Element) {
  const angles: number[] = [];
  let running = true;

  function sample() {
    if (!running) return;
    const leaf = book.querySelector('.leaf-turn');
    if (leaf) {
      const angle = angleOf(getComputedStyle(leaf).transform);
      if (angle !== undefined) angles.push(angle);
    }
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);

  return {
    angles,
    stop: () => {
      running = false;
    },
  };
}
