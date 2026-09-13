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

// A turn takes as long as it takes, and on a wide desk the verso is the half that changes
// last: it is the paper coming down that these wait on.
const LANDED = { timeout: 3000 };

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
  await expect.poll(() => versoOf(screen.container), LANDED).toBe(CONTENTS_PATH);
  expect(bookmarkOf(screen.container)).toBeNull();
});

test('reaching for the tab extends it out of the book rather than off it', async () => {
  const screen = await renderAt(BACK_PATH);
  const ribbon = screen.getByRole('link', { name: 'Go to contents' });
  await expect.element(ribbon).toBeVisible();

  const tab = screen.container.querySelector('.page-bookmark-tab') as HTMLElement;
  const paper = screen.container.querySelector('[data-spread] > .a4-leaf') as HTMLElement;

  // How far below the foot of the page the tab reaches, and how far its top edge has come
  // away from that foot. The second is the whole point: it must not move.
  const hang = () => tab.getBoundingClientRect().bottom - paper.getBoundingClientRect().bottom;
  const lip = () =>
    Math.abs(tab.getBoundingClientRect().top - paper.getBoundingClientRect().bottom);

  // And where the words sit, which travel with the end rather than staying at the top. They
  // are a bare text node, so they are measured with a range rather than by giving the label
  // a box of its own to be found by.
  const label = () => {
    const range = document.createRange();
    range.selectNodeContents(tab);
    return range.getBoundingClientRect().top - paper.getBoundingClientRect().bottom;
  };

  // Well away from the tab, and not in the band it hangs into.
  const away = screen.getByRole('heading', { level: 1 });

  // Reach away until the tab has stopped moving. Repeated rather than asserted on one try:
  // the growth is a `:hover` rule, so only a real cursor can drive it, and with both
  // browsers running at once a single mouse move is sometimes dropped. The cursor may also
  // be wherever the last click in this file left it, which is possibly on the tab.
  let resting = Number.NaN;
  await expect
    .poll(async () => {
      await away.hover();
      const now = hang();
      const stopped = now === resting;
      resting = now;
      return stopped;
    }, REACHED)
    .toBe(true);

  expect(resting).toBeGreaterThan(0);
  expect(lip()).toBeLessThan(1);
  const printed = label();

  await expect
    .poll(async () => {
      await ribbon.hover();
      return hang();
    }, REACHED)
    .toBeGreaterThan(resting);

  // Still flush with the paper: the tab got longer, it did not come loose.
  expect(lip()).toBeLessThan(1);

  // The label came down with it — by the whole of the growth, because it is held against
  // the end of the tab and not its top.
  expect(label() - printed).toBeCloseTo(hang() - resting, 0);

  // And it draws back in when the hand moves away.
  await expect
    .poll(async () => {
      await away.hover();
      return hang();
    }, REACHED)
    .toBe(resting);

  expect(lip()).toBeLessThan(1);
  expect(label()).toBeCloseTo(printed, 0);
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
