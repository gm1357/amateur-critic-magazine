import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, reviewPath } from '../../src/pages';
import { folioOf, openAt } from './issue';

const A4 = 210 / 297;

// Wide enough for two facing A4 pages. The suite's pinned viewport is a phone, so this
// file is the only one that opens the issue as a spread — and it has to hand the size
// back afterwards.
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

function leavesOf(container: HTMLElement) {
  return [...container.querySelectorAll('[data-spread] .a4-leaf')];
}

test('a wide desk opens the issue as two facing pages', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  // Two leaves, the addressed one on the left and whatever the issue prints next facing
  // it — which for a listing longer than a leaf is the rest of the listing.
  const open = openAt(screen.container);

  expect(open).toHaveLength(2);
  expect(open[0]).toBe(CONTENTS_PATH);
  expect(folioOf(screen.container)).toBe('2–3');
});

// Two windows onto one article are one article: the copy on the recto is kept out of the
// accessibility tree, or every entry of a continued listing would be read out twice.
test('an article continued across a spread is only read out once', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  const [verso, recto] = leavesOf(screen.container);
  expect(recto.getAttribute('data-page')?.startsWith(CONTENTS_PATH)).toBe(true);

  expect(verso.querySelector('.page-box')?.getAttribute('aria-hidden')).toBeNull();
  expect(recto.querySelector('.page-box')?.getAttribute('aria-hidden')).toBe('true');
  expect(screen.getByRole('link', { name: reviews[0].movie }).elements()).toHaveLength(1);
});

test('both leaves are A4 and the whole spread is on screen', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  for (const leaf of leavesOf(screen.container)) {
    const { width, height } = leaf.getBoundingClientRect();
    expect(width / height).toBeCloseTo(A4, 2);
  }

  // Sub-pixel slack: the spread is sized off viewport units, which round.
  const spread = screen.container.querySelector('[data-spread]')!.getBoundingClientRect();
  expect(spread.width).toBeLessThanOrEqual(window.innerWidth + 1);
  expect(spread.height).toBeLessThanOrEqual(window.innerHeight + 1);
});

// The pager sits under the paper now, so the spread has to leave room for it or the two
// of them together outrun the desk.
test('the pager fits on the desk below the spread', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  const pager = screen.getByRole('navigation', { name: 'Pages' }).element();
  expect(pager.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight + 1);
});

test('the cover has nothing to face, so it is alone on the right', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt('/');
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const leaves = leavesOf(screen.container);
  expect(leaves).toHaveLength(1);
  expect(leaves[0].getAttribute('data-page')).toBe('/');

  // The empty half still holds the cover on the right-hand side of the spread.
  const spread = screen.container.querySelector('[data-spread]')!;
  expect(leaves[0].getBoundingClientRect().left).toBeGreaterThan(
    spread.getBoundingClientRect().left,
  );
});

// The back cover mirrors the front: alone with nothing to face, but on the left, since
// it always lands on an odd page index.
test('the back cover has nothing to face, so it is alone on the left', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(BACK_PATH);
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const leaves = leavesOf(screen.container);
  expect(leaves).toHaveLength(1);
  expect(leaves[0].getAttribute('data-page')).toBe(BACK_PATH);

  const spread = screen.container.querySelector('[data-spread]')!;
  expect(leaves[0].getBoundingClientRect().right).toBeLessThan(
    spread.getBoundingClientRect().right,
  );
});

// A page is a pure scale of itself: everything on it is sized off the leaf, so the ratio of
// type to paper does not move when the desk does. A fixed unit anywhere on a page — the rem
// bounds of a clamp, a `text-xs` — shows up here as a ratio that changes with the viewport.
test('type keeps its proportion to the page at every size', async () => {
  const opens = reviewPath(reviews[0].slug);
  const screen = await renderAt(opens);
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  function proportions() {
    const leaf = screen.container.querySelector(`[data-page="${opens}"]`)!;
    const paper = leaf.clientWidth;
    const sizeOf = (selector: string) =>
      Number.parseFloat(getComputedStyle(leaf.querySelector(selector)!).fontSize) / paper;

    return {
      paper,
      title: sizeOf('h1'),
      body: sizeOf('article'),
      runningHead: sizeOf('header'),
    };
  }

  const phone = proportions();

  // Wider than DESK, and tall: the leaf is capped by whichever axis runs out first, so a
  // short desk would only be worth a third again as much paper to compare against.
  await page.viewport(2000, 1400);
  await expect.poll(() => proportions().paper).toBeGreaterThan(phone.paper * 1.8);
  const desk = proportions();

  expect(desk.title).toBeCloseTo(phone.title, 3);
  expect(desk.body).toBeCloseTo(phone.body, 3);
  expect(desk.runningHead).toBeCloseTo(phone.runningHead, 3);
});

// Re-cutting the issue renumbers the reader's page under them. Correcting that in an effect
// leaves one committed frame holding a spread counted against the old cut and read against
// the new one — which is a different page altogether. Nobody sees it on screen, because the
// corrected frame lands immediately after. A printer does: it lays the page out at paper
// width, which re-cuts the issue to a single leaf, and photographs that first frame. Printing
// any review used to hand back a different review.
test('re-cutting the issue never puts the wrong page on the desk, even for a frame', async () => {
  await page.viewport(DESK.width, DESK.height);
  const opens = reviewPath(reviews[5].slug);
  const screen = await renderAt(opens);
  await expect
    .element(screen.getByRole('heading', { level: 1, name: reviews[5].movie }))
    .toBeVisible();

  // Every state the desk passes through, not every state a poll happens to catch.
  const seen: string[][] = [openAt(screen.container)];
  const watch = new MutationObserver(() => seen.push(openAt(screen.container)));
  watch.observe(screen.container, {
    attributeFilter: ['data-page'],
    attributes: true,
    childList: true,
    subtree: true,
  });

  // Narrow enough to read one leaf at a time: the same pages, cut into different spreads.
  await page.viewport(430, 900);
  await expect.poll(() => openAt(screen.container)).toEqual([opens]);
  watch.disconnect();

  expect(seen.length).toBeGreaterThan(1);
  for (const open of seen) expect(open).toContain(opens);
});

test('the pager counts spreads but still prints page numbers', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);

  await expect.poll(() => folioOf(screen.container)).toBe('2–3');
});

// Two facing pages are one leaf, so a step past them is one turn — not two.
test('paging forward on a wide desk moves a whole leaf', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  const open = openAt(screen.container);
  await screen.getByRole('link', { name: 'Next' }).click();

  // The leaf has to come down before the halves under it are the new spread.
  const book = screen.container.querySelector('[data-spread]')!;
  await expect.poll(() => book.getAttribute('data-spread')).toBe('2');

  // Two new pages, neither of them one that was already open, and the folio moved on by
  // the two leaves that were turned past.
  const landed = openAt(screen.container);
  expect(landed).toHaveLength(2);
  expect(landed.some((path) => open.includes(path))).toBe(false);
  expect(folioOf(screen.container)).toBe('4–5');
});

test('a phone reads the issue one leaf at a time', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  expect(openAt(screen.container)).toEqual([CONTENTS_PATH]);
  expect(folioOf(screen.container)).toBe('2');
});

// Page type is measured in cqw against the leaf. If the container had stayed on the whole
// spread, every page would set its type twice as large the moment the desk got wide.
test('page type is measured against one leaf, not the open book', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt('/');
  const title = screen.getByRole('heading', { level: 1 });
  await expect.element(title).toBeVisible();

  const leaf = leavesOf(screen.container)[0].getBoundingClientRect();
  expect(title.element().getBoundingClientRect().width).toBeLessThanOrEqual(leaf.width);
});
