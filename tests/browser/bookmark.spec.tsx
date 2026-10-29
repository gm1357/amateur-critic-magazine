import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, reviewPath } from '../../src/pages';

// Wide enough for two facing A4 pages, so the ribbon can be asked which leaf it hangs from.
const DESK = { width: 1280, height: 800 };
const viewport = { width: window.innerWidth, height: window.innerHeight };

// A hover has to be re-offered until it takes, so this is a budget for several attempts.
const REACHED = { timeout: 6000 };

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
    await expect.poll(() => versoOf(container)).not.toBe(verso);
  }

  throw new Error('never read past the listing');
}

test('the cover and the listing are not marked a way back to themselves', async () => {
  const screen = await renderAt('/');
  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('The Weekend Critic');
  expect(bookmarkOf(screen.container)).toBeNull();

  await screen.getByRole('link', { name: 'Next' }).click();

  await expect.poll(() => versoOf(screen.container)).toBe(CONTENTS_PATH);
  expect(bookmarkOf(screen.container)).toBeNull();
});

test('the ribbon appears once the listing is behind the reader', async () => {
  const screen = await renderAt(CONTENTS_PATH);

  await readPastTheListing(screen.container, screen.getByRole('link', { name: 'Next' }));

  await expect.element(screen.getByRole('link', { name: 'Go to contents' })).toBeVisible();
});

test('the ribbon is still in the book at the very back of the issue', async () => {
  const screen = await renderAt(BACK_PATH);

  await expect.element(screen.getByRole('link', { name: 'Go to contents' })).toBeVisible();
});

test('pulling the ribbon turns back to the listing', async () => {
  const last = reviews[reviews.length - 1];
  const screen = await renderAt(reviewPath(last.slug));
  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(last.movie);

  await screen.getByRole('link', { name: 'Go to contents' }).click();

  // A turn like any other: the URL is what moves, and the leaf follows it.
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();
  await expect.poll(() => versoOf(screen.container)).toBe(CONTENTS_PATH);
  expect(bookmarkOf(screen.container)).toBeNull();
});

test('reaching for the tab extends it out of the book rather than off it', async () => {
  const screen = await renderAt(BACK_PATH);
  const ribbon = screen.getByRole('link', { name: 'Go to contents' });
  await expect.element(ribbon).toBeVisible();

  const tab = screen.container.querySelector('.page-bookmark-tab') as HTMLElement;
  const paper = screen.container.querySelector('[data-spread] > .a4-leaf') as HTMLElement;

  // This is about where the tab comes to rest, not how it eases there. Chasing the last
  // fraction of a pixel of a 180ms transition makes a test that reports on the clock, so it
  // is turned off and every reading is the settled one.
  const still = screen.container.ownerDocument.createElement('style');
  still.textContent = '.page-bookmark-tab { transition: none !important }';
  screen.container.ownerDocument.head.append(still);

  try {
    // How far below the foot of the page the tab reaches, and how far its top edge has come
    // away from that foot. The second is the whole point: it must not move.
    const hang = () => tab.getBoundingClientRect().bottom - paper.getBoundingClientRect().bottom;
    const lip = () =>
      Math.abs(tab.getBoundingClientRect().top - paper.getBoundingClientRect().bottom);

    // And where the words sit. They are a bare text node, so they are measured with a range
    // rather than by giving the label a box of its own to be found by: how far down the page
    // they have come, and how far they sit above the end of the tab. The second is the
    // invariant — held against the end means it never changes.
    const words = () => {
      const range = screen.container.ownerDocument.createRange();
      range.selectNodeContents(tab);
      return range.getBoundingClientRect().bottom;
    };

    const label = () => words() - paper.getBoundingClientRect().bottom;
    const inset = () => tab.getBoundingClientRect().bottom - words();

    // Well away from the tab, and not in the band it hangs into.
    const away = screen.getByRole('heading', { level: 1 });

    // The growth is a `:hover` rule, so only a real cursor can drive it. Waiting on the
    // state itself rather than on the geometry says whether the move has been taken up at
    // all — and Firefox will not re-evaluate `:hover` for a move that lands on the
    // coordinate the cursor is at already, which is why the tab is reached for first: the
    // cursor starts wherever the last click in this file left it, possibly on the tab.
    async function reach(target: { hover: () => Promise<void> }, onIt: boolean) {
      await target.hover();
      await expect.poll(() => ribbon.element().matches(':hover'), REACHED).toBe(onIt);
    }

    await reach(ribbon, true);
    await reach(away, false);

    const resting = hang();
    const printed = label();
    const seated = inset();

    expect(resting).toBeGreaterThan(0);
    expect(lip()).toBeLessThan(1);

    await reach(ribbon, true);

    expect(hang()).toBeGreaterThan(resting);

    // Still flush with the paper: the tab got longer, it did not come loose.
    expect(lip()).toBeLessThan(1);

    // And the words came down with the end rather than staying at the top — the same
    // distance above it as before, and further down the page than they were.
    expect(inset()).toBeCloseTo(seated, 0);
    expect(label()).toBeGreaterThan(printed);

    // It all draws back in when the hand moves away.
    await reach(away, false);

    expect(hang()).toBeCloseTo(resting, 0);
    expect(label()).toBeCloseTo(printed, 0);
    expect(inset()).toBeCloseTo(seated, 0);
    expect(lip()).toBeLessThan(1);
  } finally {
    still.remove();
  }
});

// Lettered a word-group to a line, but read as one phrase: the break is in the label's own
// text, and only the eye is meant to see it.
test('the label is stacked on two lines and still reads as one phrase', async () => {
  const screen = await renderAt(BACK_PATH);
  const ribbon = screen.getByRole('link', { name: 'Go to contents' });
  await expect.element(ribbon).toBeVisible();

  const tab = screen.container.querySelector('.page-bookmark-tab') as HTMLElement;
  const text = tab.firstChild as Text;
  const split = text.data.indexOf('contents');

  // Where each part of the label is set, measured a character's width in from its start.
  const topOf = (from: number) => {
    const range = screen.container.ownerDocument.createRange();
    range.setStart(text, from);
    range.setEnd(text, from + 1);
    return range.getBoundingClientRect().top;
  };

  expect(topOf(split)).toBeGreaterThan(topOf(0));
});

// The tab belongs to the paper, so it is a pure scale of the page the way the type on it
// is: the same fraction of a leaf on a phone as on a desk. A fixed unit anywhere in it —
// a rem of padding, a `text-xs` — shows up here as a ratio that moves with the viewport.
test('the tab keeps its proportion to the page at every size', async () => {
  const screen = await renderAt(BACK_PATH);
  await expect.element(screen.getByRole('link', { name: 'Go to contents' })).toBeVisible();

  function proportions() {
    const leaf = screen.container.querySelector('[data-spread] > .a4-leaf')!;
    const tab = screen.container.querySelector('.page-bookmark-tab')!;
    const paper = leaf.getBoundingClientRect().width;
    const box = tab.getBoundingClientRect();

    return {
      paper,
      width: box.width / paper,
      height: box.height / paper,
      type: Number.parseFloat(getComputedStyle(tab).fontSize) / paper,
      // The rule is its own element, and in pixels rather than as a fraction: a sub-pixel
      // border is snapped to whole device pixels, so the ratio wobbles by more than it is
      // worth asserting on.
      edge: Number.parseFloat(getComputedStyle(tab, '::before').borderBottomWidth),
    };
  }

  const phone = proportions();

  // Wider than DESK, and tall: the leaf is capped by whichever axis runs out first, so a
  // short desk would only be worth a third again as much paper to compare against.
  await page.viewport(1600, 1300);
  await expect.poll(() => proportions().paper).toBeGreaterThan(phone.paper * 1.8);

  // The tab's height is a transitioned property, so a desk that just changed size leaves it
  // a moment behind the paper. Polled rather than read once, or the ratio is taken from
  // somewhere in the middle of that animation.
  await expect.poll(() => proportions().height).toBeCloseTo(phone.height, 2);

  const desk = proportions();
  expect(desk.width).toBeCloseTo(phone.width, 2);
  expect(desk.type).toBeCloseTo(phone.type, 3);

  // The line round it grows with the paper too. Set at 1px the way the magazine's hairlines
  // are, it would come back the same width on both desks.
  expect(phone.edge).toBeGreaterThan(0);
  expect(desk.edge).toBeGreaterThan(phone.edge);
});

// The band under the paper is where it hangs, and that band is `--desk-chrome` tall and
// already spoken for. A tab that grew with the leaf would land on the pager on a wide desk,
// which is the whole reason it is measured in the desk's units instead. One test per size,
// so each gets a desk of its own rather than a second magazine on the last one's.
for (const size of [
  { width: 360, height: 640 },
  { width: 414, height: 896 },
  { width: DESK.width, height: DESK.height },
  { width: 1600, height: 1300 },
]) {
  test(`the tab covers no chrome at ${size.width}x${size.height}`, async () => {
    await page.viewport(size.width, size.height);
    const screen = await renderAt(BACK_PATH);
    const ribbon = screen.getByRole('link', { name: 'Go to contents' });
    await expect.element(ribbon).toBeVisible();

    // The hit area rather than the tab: it reaches further down, because it carries the
    // room the tab is pulled into.
    const hit = ribbon.element().getBoundingClientRect();
    const chrome = [
      ...screen.container.querySelectorAll('nav[aria-label="Pages"] > *, [role="group"] > *'),
    ];

    expect(chrome.length).toBeGreaterThan(0);
    for (const control of chrome) {
      const box = control.getBoundingClientRect();
      const clear =
        hit.right <= box.left ||
        box.right <= hit.left ||
        hit.bottom <= box.top ||
        box.bottom <= hit.top;

      expect(`${control.textContent?.trim()}: ${clear}`).toBe(
        `${control.textContent?.trim()}: true`,
      );
    }
  });
}
