import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, reviewPath } from '../../src/pages';

// Wide enough for two facing A4 pages, so the ribbon can be asked which leaf it hangs from.
const DESK = { width: 1280, height: 800 };
const viewport = { width: window.innerWidth, height: window.innerHeight };

// A turn takes as long as it takes, and on a wide desk the verso is the half that changes
// last: it is the paper coming down that these wait on.
const LANDED = { timeout: 3000 };

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

function bookmarkOf(container: HTMLElement) {
  return container.querySelector('[data-spread] .page-bookmark');
}

// The page the ribbon hangs from: the left-hand leaf standing on the desk — which, reading
// one leaf at a time, is the only leaf there is. Direct children only, because the two
// faces of a leaf in the air are pages of the issue too, and a ribbon is not stuck to them.
function versoOf(container: HTMLElement): string {
  return container.querySelector('[data-spread] > .a4-leaf')?.getAttribute('data-page') ?? '';
}

// Reads forward until the left-hand leaf is past the listing, checking on the way that the
// ribbon is not printed while there is nothing yet to mark a way back to. How far that is
// depends on how much paper the composing room gave the listing, so this is "until" and
// never a page number written down here.
async function readPastTheListing(container: HTMLElement, next: { click: () => Promise<void> }) {
  for (let turn = 0; turn < 12; turn++) {
    const verso = versoOf(container);
    if (!verso.startsWith(CONTENTS_PATH)) return;

    expect(bookmarkOf(container)).toBeNull();

    await next.click();
    await expect.poll(() => versoOf(container), LANDED).not.toBe(verso);
  }

  throw new Error('never read past the listing');
}

test('the cover and the listing are not marked a way back to themselves', async () => {
  const screen = await renderAt('/');
  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('Amateur Critic Magazine');
  expect(bookmarkOf(screen.container)).toBeNull();

  await screen.getByRole('link', { name: 'Next' }).click();

  await expect.poll(() => versoOf(screen.container), LANDED).toBe(CONTENTS_PATH);
  expect(bookmarkOf(screen.container)).toBeNull();
});

test('the ribbon appears once the listing is behind the reader', async () => {
  const screen = await renderAt(CONTENTS_PATH);

  await readPastTheListing(screen.container, screen.getByRole('link', { name: 'Next' }));

  await expect.element(screen.getByRole('link', { name: 'Back to contents' })).toBeVisible();
});

test('the ribbon is still in the book at the very back of the issue', async () => {
  const screen = await renderAt(BACK_PATH);

  await expect.element(screen.getByRole('link', { name: 'Back to contents' })).toBeVisible();
});

test('pulling the ribbon turns back to the listing', async () => {
  const last = reviews[reviews.length - 1];
  const screen = await renderAt(reviewPath(last.slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(last.movie);

  await screen.getByRole('link', { name: 'Back to contents' }).click();

  // A turn like any other: the URL is what moves, and the leaf follows it.
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();
  await expect.poll(() => versoOf(screen.container), LANDED).toBe(CONTENTS_PATH);
  expect(bookmarkOf(screen.container)).toBeNull();
});

test('the ribbon pulls down when the reader reaches for it', async () => {
  const screen = await renderAt(BACK_PATH);
  const ribbon = screen.getByRole('link', { name: 'Back to contents' });
  await expect.element(ribbon).toBeVisible();

  const tab = screen.container.querySelector('.page-bookmark-tab') as HTMLElement;
  const pulled = () => new DOMMatrixReadOnly(getComputedStyle(tab).transform).m42;

  // Somewhere on the desk the ribbon does not reach: pulled out, it hangs into the band
  // the pager shares, and the cursor is wherever the last click in this file left it.
  const away = screen.getByRole('group', { name: 'Zoom' });
  await userEvent.hover(away);
  await expect.poll(pulled).toBe(0);

  await userEvent.hover(ribbon);
  await expect.poll(pulled).toBeGreaterThan(0);

  // And goes back between the pages when the hand moves away.
  await userEvent.hover(away);
  await expect.poll(pulled).toBe(0);
});

// It hangs from the left-hand leaf, so on a wide desk it is the verso — the page the
// reader's left thumb is holding — that says whether it is printed at all. Both of these
// are read from a fresh mount rather than from a page turn: which leaf a ribbon is stuck
// to is a fact about the open book, not about how the reader got there.
test('on a wide desk the listing itself is still not marked', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();

  expect(versoOf(screen.container)).toBe(CONTENTS_PATH);
  expect(bookmarkOf(screen.container)).toBeNull();
});

test('on a wide desk the ribbon hangs from the left-hand page', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(BACK_PATH);
  const ribbon = screen.getByRole('link', { name: 'Back to contents' });
  await expect.element(ribbon).toBeVisible();

  // The back cover always lands on an odd page index, so it is the verso of its spread.
  expect(versoOf(screen.container)).toBe(BACK_PATH);

  // Over the left-hand leaf, and hanging below the foot of it.
  const paper = screen.container.querySelector('[data-spread] > .a4-leaf')!.getBoundingClientRect();
  const tab = ribbon.element().getBoundingClientRect();

  expect(tab.left).toBeGreaterThan(paper.left);
  expect(tab.right).toBeLessThan(paper.right);
  expect(tab.bottom).toBeGreaterThan(paper.bottom);
});
