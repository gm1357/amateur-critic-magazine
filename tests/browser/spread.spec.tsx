import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, pages, reviewPath } from '../../src/pages';

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
  return [...container.querySelectorAll('.a4-leaf')];
}

test('a wide desk opens the issue as two facing pages', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  const leaves = leavesOf(screen.container);

  expect(leaves.map((leaf) => leaf.getAttribute('data-page'))).toEqual([
    CONTENTS_PATH,
    reviewPath(reviews[0].slug),
  ]);
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

test('the pager counts spreads but still prints page numbers', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);

  await expect.element(screen.getByText(`2–3 / ${pages.length}`)).toBeVisible();
});

// Two facing pages are one leaf, so a step past them is one turn — not two.
test('paging forward on a wide desk moves a whole leaf', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  await screen.getByRole('link', { name: 'Next' }).click();

  // The leaf has to come down before the halves under it are the new spread. Spread two
  // is where it lands: reviews two and three, past both pages that were already open.
  const book = screen.container.querySelector('[data-spread]')!;
  await expect.poll(() => book.getAttribute('data-spread')).toBe('2');

  const leaves = leavesOf(screen.container);
  expect(leaves.map((leaf) => leaf.getAttribute('data-page'))).toEqual([
    reviewPath(reviews[1].slug),
    reviewPath(reviews[2].slug),
  ]);
  await expect.element(screen.getByText(`4–5 / ${pages.length}`)).toBeVisible();
});

test('a phone reads the issue one leaf at a time', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  const leaves = leavesOf(screen.container);
  expect(leaves).toHaveLength(1);
  expect(leaves[0].getAttribute('data-page')).toBe(CONTENTS_PATH);
  await expect.element(screen.getByText(`2 / ${pages.length}`)).toBeVisible();
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
