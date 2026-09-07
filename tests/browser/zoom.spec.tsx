import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { CONTENTS_PATH, reviewPath } from '../../src/pages';
import { MAX_SCALE } from '../../src/zoom';
import { folioOf, totalOf } from './issue';
import { centreOf, pinch, swipe, tap } from './pointer';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function deskOf(container: HTMLElement) {
  return container.querySelector('[data-zoom]')!;
}

function paperOf(container: HTMLElement) {
  return container.querySelector('[data-spread] .a4-leaf')!;
}

function viewportOf(container: HTMLElement) {
  return container.querySelector('.magazine-viewport')!;
}

function scaleOf(container: HTMLElement): number {
  const zoom = container.querySelector('.magazine-zoom') as HTMLElement;
  return Number(zoom.style.getPropertyValue('--zoom') || 1);
}

// Structurally typed on the locator, so the helper needs no import of vitest's own types.
async function press(button: { click: () => Promise<void> }, times = 1) {
  for (let count = 0; count < times; count++) await button.click();
}

// The whole point of the feature, and the whole risk of it: the paper is magnified without
// being laid out again. `clientWidth` is layout and `getBoundingClientRect` is what you see,
// so the two parting company is the proof that this is a view over a fixed page.
test('zooming magnifies the page without laying it out again', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const paper = paperOf(screen.container);
  const printed = paper.clientWidth;
  const shown = paper.getBoundingClientRect().width;

  await press(screen.getByRole('button', { name: 'Zoom in' }), 2);

  await expect
    .poll(() => paperOf(screen.container).getBoundingClientRect().width)
    .toBeGreaterThan(shown * 1.4);
  expect(paperOf(screen.container).clientWidth).toBe(printed);
});

// If a folio ever moved because somebody looked closer, the transform would have leaked into
// the layout and the issue would be re-typesetting itself.
test('looking closer does not re-typeset the issue', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const folio = folioOf(screen.container);
  const total = totalOf(screen.container);

  await press(screen.getByRole('button', { name: 'Zoom in' }), 3);

  expect(folioOf(screen.container)).toBe(folio);
  expect(totalOf(screen.container)).toBe(total);
});

// At fit the paper carries nothing at all — no transform, no clip, no touch-action override.
// That is what keeps the page turn, the type and every other test exactly as they were.
test('the whole page on the desk carries no transform and no clip', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const desk = deskOf(screen.container);
  const zoom = screen.container.querySelector('.magazine-zoom')!;

  expect(desk.getAttribute('data-zoom')).toBe('fit');
  expect(getComputedStyle(zoom).transform).toBe('none');
  expect(getComputedStyle(viewportOf(screen.container)).overflow).toBe('visible');
  expect(getComputedStyle(paperOf(screen.container)).touchAction).toBe('pan-y');

  await press(screen.getByRole('button', { name: 'Zoom in' }));

  expect(desk.getAttribute('data-zoom')).toBe('in');
  expect(getComputedStyle(paperOf(screen.container)).touchAction).toBe('none');
});

// A finger that comes down on the type has to move the paper exactly as one that comes down
// on the margin does. It did not: `.page-window` clips the columns, so it is a scroll
// container, and a touch resolves its touch-action only as far as *its* scroll container —
// which meant the leaf's declaration never reached the text, and the browser was free to
// claim any drag that began on a word. Synthetic pointers are never cancelled that way, so
// this is asserted by computed style; the failure itself only shows on a real device.
test('a drag that begins on the type is the reader moving the paper, not choosing words', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  await press(screen.getByRole('button', { name: 'Zoom in' }), 3);

  const leaf = paperOf(screen.container);

  for (const node of [
    leaf,
    leaf.querySelector('.leaf-page')!,
    leaf.querySelector('.page-window')!,
  ]) {
    expect(getComputedStyle(node).touchAction).toBe('none');
  }

  // Asserted on the leaf, where it is declared: a child's `user-select` *computes* to `auto`
  // even where its used value is none, so the engines disagree about what the type says.
  expect(getComputedStyle(leaf).userSelect).toBe('none');
});

// A magnified page is read by dragging it about, so dragging must not also turn it.
test('dragging a magnified page moves the paper and does not turn it', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  await press(screen.getByRole('button', { name: 'Zoom in' }), 3);

  const book = screen.container.querySelector('[data-spread]')!;
  const viewport = viewportOf(screen.container);
  const spread = book.getAttribute('data-spread');
  const paper = paperOf(screen.container).getBoundingClientRect();
  const from = { x: paper.left + paper.width * 0.6, y: paper.top + paper.height * 0.6 };

  await swipe(from, { x: from.x - paper.width * 0.4, y: from.y - paper.height * 0.3 });

  expect(viewport.scrollLeft).toBeGreaterThan(0);
  expect(viewport.scrollTop).toBeGreaterThan(0);
  expect(book.getAttribute('data-spread')).toBe(spread);
  expect(book.getAttribute('data-phase')).toBe('rest');
  expect(screen.container.querySelector('.leaf-turn')).toBeNull();
});

// The clamp, observed: the paper is pulled about inside its own edges and never off them.
test('the paper cannot be dragged off its own corner', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  await press(screen.getByRole('button', { name: 'Zoom in' }), 3);

  const viewport = viewportOf(screen.container);
  const paper = paperOf(screen.container).getBoundingClientRect();
  const middle = { x: paper.left + paper.width * 0.5, y: paper.top + paper.height * 0.5 };

  // Hauled well past the top-left corner, and further than the page is wide.
  await swipe(middle, { x: middle.x + paper.width * 2, y: middle.y + paper.height * 2 });

  expect(viewport.scrollLeft).toBe(0);
  expect(viewport.scrollTop).toBe(0);
});

test('the page edges are out of reach while the page is magnified', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  expect(screen.container.querySelectorAll('[data-turn-zone]').length).toBeGreaterThan(0);

  await press(screen.getByRole('button', { name: 'Zoom in' }));
  expect(screen.container.querySelectorAll('[data-turn-zone]')).toHaveLength(0);
});

// The magnification is a magnifying glass held over the book, not a property of one page.
test('the magnification survives a page turn, and the new page starts at its head', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  await press(screen.getByRole('button', { name: 'Zoom in' }), 3);

  const magnified = scaleOf(screen.container);
  const viewport = viewportOf(screen.container);
  const paper = paperOf(screen.container).getBoundingClientRect();
  const middle = { x: paper.left + paper.width * 0.6, y: paper.top + paper.height * 0.6 };

  await swipe(middle, { x: middle.x - paper.width * 0.3, y: middle.y - paper.height * 0.3 });
  expect(viewport.scrollTop).toBeGreaterThan(0);

  await userEvent.keyboard('{ArrowRight}');
  await expect
    .element(screen.getByRole('heading', { level: 1, name: reviews[1].movie }))
    .toBeVisible();

  await expect.poll(() => viewportOf(screen.container).scrollTop).toBe(0);
  expect(viewportOf(screen.container).scrollLeft).toBe(0);
  expect(scaleOf(screen.container)).toBe(magnified);
});

test('the buttons stop at the ends of the range and say where they are', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  await expect.element(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
  await expect.element(screen.getByText('100%')).toBeVisible();

  // Pressed until it stops rather than a fixed number of times: the button takes itself out
  // of reach at the top of the range, which is the thing being asserted.
  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
  for (let count = 0; count < 20 && !zoomIn.element().hasAttribute('disabled'); count++) {
    await zoomIn.click();
  }

  expect(scaleOf(screen.container)).toBe(MAX_SCALE);
  await expect.element(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
  await expect.element(screen.getByText(`${MAX_SCALE * 100}%`)).toBeVisible();
});

// Two fingers is the gesture a phone reaches for first, and the one no single pointer can
// stand in for: a pinch is defined by the gap between two of them.
test('spreading two fingers magnifies the page, and pinching gives it back', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const paper = paperOf(screen.container).getBoundingClientRect();
  const middle = { x: paper.left + paper.width / 2, y: paper.top + paper.height / 2 };
  const near: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: middle.x - 30, y: middle.y },
    { x: middle.x + 30, y: middle.y },
  ];
  const far: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: middle.x - 90, y: middle.y },
    { x: middle.x + 90, y: middle.y },
  ];

  await pinch(near, far);
  await expect.poll(() => scaleOf(screen.container)).toBeCloseTo(3, 1);

  await pinch(far, near);
  await expect.poll(() => deskOf(screen.container).getAttribute('data-zoom')).toBe('fit');
});

test('a double tap looks closer, and another gives the page back', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const paper = paperOf(screen.container).getBoundingClientRect();
  const at = { x: paper.left + paper.width * 0.4, y: paper.top + paper.height * 0.4 };

  await tap(at, 2);
  await expect.poll(() => scaleOf(screen.container)).toBe(2);

  await tap(at, 2);
  await expect.poll(() => deskOf(screen.container).getAttribute('data-zoom')).toBe('fit');
});

// The gesture belongs to a finger. A mouse has the buttons and the wheel, and double
// clicking a page is far too easy to do by accident to have it magnify the paper.
test('a mouse double click does not zoom', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  // Real input, through the browser's own event synthesis, rather than pointers this suite
  // constructed — a double click is exactly what those would fail to reproduce faithfully.
  await userEvent.dblClick(paperOf(screen.container));

  expect(deskOf(screen.container).getAttribute('data-zoom')).toBe('fit');
  expect(scaleOf(screen.container)).toBe(1);
});

// A tap on an entry is the reader following it, not asking for a closer look at it.
test('a double tap on a contents entry follows the entry', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const entry = screen.getByRole('link', { name: reviews[2].movie }).element();
  await tap(centreOf(entry), 2);

  expect(deskOf(screen.container).getAttribute('data-zoom')).toBe('fit');
});
