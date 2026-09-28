import { render } from 'vitest-browser-react';
import { afterEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { frameOf } from '../../src/data/frames';
import { reviews } from '../../src/data/reviews';
import { folioOf, openAt, totalOf } from './issue';

// Expectations are derived from the real `reviews` array so that editing a JSON file
// does not break tests that are not about that review.
const review = reviews[1];
const hearted = reviews.find((entry) => entry.hearted)!;
const plain = reviews.find((entry) => !entry.hearted)!;
const framed = reviews.find((entry) => frameOf(entry.slug))!;

// Every review in the issue may well have a still, so the plain-paper case cannot count on
// the data to supply one. `frameOf` is spied on — the real lookup until a test says otherwise.
vi.mock('../../src/data/frames', { spy: true });

// The leaf on the desk, never one being counted in the composing room.
function leafOf(container: HTMLElement, slug: string): HTMLElement {
  return container.querySelector(`[data-spread] [data-page="/reviews/${slug}"]`)!;
}

// The suite's pinned viewport, handed back after a test that changes the size of the desk.
const viewport = { width: window.innerWidth, height: window.innerHeight };

afterEach(async () => {
  await page.viewport(viewport.width, viewport.height);
  vi.mocked(frameOf).mockReset();
});

// How far the still overshoots or falls short of the masthead's rule, as it is shown.
function gapOf(leaf: HTMLElement): number {
  const still = leaf.querySelector('[data-frame]')!.getBoundingClientRect();
  const masthead = leaf.querySelector('[data-masthead]')!.getBoundingClientRect();
  return still.bottom - masthead.bottom;
}

// Relative luminance, near enough: the question is only ever "light or dark type".
function lightness(color: string): number {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

test('a review page shows the movie, score, dateline and body', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${review.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(review.movie);
  await expect
    .element(screen.getByRole('img', { name: `${review.score} out of 10` }))
    .toBeVisible();
  await expect.element(screen.getByText(review.text.slice(0, 40), { exact: false })).toBeVisible();
});

test('an odd score fills exactly half a star', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${review.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  const badge = screen.getByRole('img', { name: `${review.score} out of 10` });
  await expect.element(badge).toBeVisible();

  const rows = badge.element().querySelectorAll('span');
  const track = rows[0].getBoundingClientRect().width;
  const fill = rows[1].getBoundingClientRect().width;

  expect(fill / track).toBeCloseTo(review.score / 10, 2);
});

test('the page number follows the URL, not the click history', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${review.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(review.movie);

  // Deep-linked rather than paged to. Which folio that is depends on how much paper the
  // articles ahead of it took, so what is asserted is that the issue opened *here* — past
  // the cover and the contents, and inside its own covers.
  const folio = Number(folioOf(screen.container));

  expect(openAt(screen.container)).toEqual([`/reviews/${review.slug}`]);
  expect(folio).toBeGreaterThan(2);
  expect(folio).toBeLessThanOrEqual(totalOf(screen.container));
});

test('an unknown slug gets a not-found page with no magazine chrome', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={['/reviews/not-a-real-movie']}>
      <App />
    </MemoryRouter>,
  );

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('This page was never printed');
  await expect.element(screen.getByRole('link', { name: 'Back to the cover' })).toBeVisible();
  expect(screen.getByText(/^\d+ \/ \d+$/).elements()).toHaveLength(0);
});

test('a path outside the magazine gets the not-found page too', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={['/some/random/path']}>
      <App />
    </MemoryRouter>,
  );

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('This page was never printed');
});

test('the dateline is human-readable and carries the raw ISO date', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${review.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  const dateline = screen.getByText(/^\d+ \w+ \d+$/);
  const movieDate = new Date(review.date);

  await expect.element(dateline).toHaveAttribute('datetime', movieDate.toISOString().split('T')[0]);
});

test('a hearted review is stamped with a seal in the corner of the page', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${hearted.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  const seal = screen.getByRole('img', { name: 'Seal of approval' });
  await expect.element(seal).toBeVisible();

  const heading = screen.getByRole('heading', { level: 1 }).element();
  expect(heading.contains(seal.element())).toBe(true);

  const margin = heading.getBoundingClientRect();
  const title = heading.firstElementChild!.getBoundingClientRect();
  const stamp = seal.element().getBoundingClientRect();

  // Pinned to the outer margin, however short the title is...
  expect(margin.right - stamp.right).toBeLessThanOrEqual(1);
  // ...and never set against the name, however long it runs.
  expect(stamp.left).toBeGreaterThan(title.right);
});

test('a review that was not hearted carries no seal', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${plain.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(plain.movie);
  expect(screen.getByRole('img', { name: 'Seal of approval' }).elements()).toHaveLength(0);
});

// Full bleed: from the top of the paper, over the running head, edge to edge, down to the
// masthead's rule — and no further, so the body copy is set on plain paper.
test('a review with a frame prints it behind the masthead, down to its rule', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${framed.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(framed.movie);

  const leaf = leafOf(screen.container, framed.slug);
  const stills = leaf.querySelectorAll('[data-frame]');
  expect(stills).toHaveLength(1);

  const still = stills[0].getBoundingClientRect();
  const paper = leaf.getBoundingClientRect();
  const masthead = leaf.querySelector('article header')!.getBoundingClientRect();

  expect(still.top).toBeCloseTo(paper.top + leaf.clientTop, 0);
  expect(still.left).toBeCloseTo(paper.left + leaf.clientLeft, 0);
  expect(still.right).toBeCloseTo(paper.left + leaf.clientLeft + leaf.clientWidth, 0);
  expect(Math.abs(still.bottom - masthead.bottom)).toBeLessThanOrEqual(1);

  // Cropped to fill rather than stretched, and kept out of the accessibility tree.
  const image = stills[0].querySelector('img')!;
  expect(getComputedStyle(image).objectFit).toBe('cover');
  expect(image.getAttribute('alt')).toBe('');
  expect(stills[0].getAttribute('aria-hidden')).toBe('true');

  // The scrim starts light enough to show the photograph and deepens towards the rule.
  const scrim = getComputedStyle(stills[0].querySelector('[data-scrim]')!).backgroundImage;
  const alphas = [...scrim.matchAll(/\/\s*([\d.]+)\)/g)].map((match) => Number(match[1]));

  // No direction printed is the default, top to bottom.
  expect(scrim).toMatch(/^linear-gradient\((?!to )/);
  expect(alphas[0]).toBeCloseTo(0.25, 2);
  expect(alphas.at(-1)!).toBeCloseTo(0.7, 2);
  expect(alphas.at(-1)!).toBeGreaterThan(alphas[0]);

  // The type over it is set light, whatever the theme, so it reads on the scrim.
  const title = screen.getByRole('heading', { level: 1 }).element();
  expect(lightness(getComputedStyle(title).color)).toBeGreaterThan(0.8);
});

test('a review without a frame keeps its plain paper', async () => {
  const unframed = review;
  vi.mocked(frameOf).mockReturnValue(undefined);

  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${unframed.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(unframed.movie);

  expect(leafOf(screen.container, unframed.slug).querySelector('[data-frame]')).toBeNull();
  expect(leafOf(screen.container, unframed.slug).querySelector('.on-frame')).toBeNull();
});

// A one-line title keeps the room of a two-line one, so paging through the issue the score,
// the rule and the first line of copy do not jump about with the length of a film's name.
test('every masthead is two title lines deep, however long the title', async () => {
  const byLength = [...reviews].sort((a, b) => a.movie.length - b.movie.length);
  const depths: number[] = [];

  for (const entry of [byLength[0], byLength.at(-1)!]) {
    const screen = await render(
      <MemoryRouter initialEntries={[`/reviews/${entry.slug}`]}>
        <App />
      </MemoryRouter>,
    );

    const heading = screen.getByRole('heading', { level: 1 });
    await expect.element(heading).toHaveTextContent(entry.movie);

    const title = heading.element();
    const line = Number.parseFloat(getComputedStyle(title).lineHeight);
    expect(title.getBoundingClientRect().height).toBeCloseTo(2 * line, 0);

    depths.push(title.closest('header')!.getBoundingClientRect().height);
    await screen.unmount();
  }

  expect(Math.abs(depths[0] - depths[1])).toBeLessThanOrEqual(0.5);
});

// The still is measured in the leaf's own layout, not off the screen: a page magnified for a
// closer look is the same page, and its still stops at the same rule.
test('the frame still meets the rule on a magnified page', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${framed.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(framed.movie);

  const leaf = leafOf(screen.container, framed.slug);
  const shown = leaf.getBoundingClientRect().width;

  const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
  await zoomIn.click();
  await zoomIn.click();

  await expect.poll(() => leaf.getBoundingClientRect().width).toBeGreaterThan(shown * 1.4);
  const scale = leaf.getBoundingClientRect().width / shown;
  expect(Math.abs(gapOf(leaf))).toBeLessThanOrEqual(scale);
});

// A leaf laid out at another size — a wider desk, or the printer — takes the still with it.
test('the frame follows the masthead when the leaf changes size', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${framed.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(framed.movie);

  const before = leafOf(screen.container, framed.slug).clientWidth;
  await page.viewport(viewport.width * 2, viewport.height * 2);
  await expect
    .poll(() => leafOf(screen.container, framed.slug)?.clientWidth)
    .toBeGreaterThan(before);

  await expect
    .poll(() => Math.abs(gapOf(leafOf(screen.container, framed.slug))))
    .toBeLessThanOrEqual(1);
});
