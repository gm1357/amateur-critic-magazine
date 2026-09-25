import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
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
const unframed = reviews.find((entry) => !frameOf(entry.slug))!;

// The leaf on the desk, never one being counted in the composing room.
function leafOf(container: HTMLElement, slug: string): HTMLElement {
  return container.querySelector(`[data-spread] [data-page="/reviews/${slug}"]`)!;
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

  // The type over it is set light, whatever the theme, so it reads on the scrim.
  const title = screen.getByRole('heading', { level: 1 }).element();
  expect(lightness(getComputedStyle(title).color)).toBeGreaterThan(0.8);
});

test('a review without a frame keeps its plain paper', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${unframed.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(unframed.movie);

  expect(leafOf(screen.container, unframed.slug).querySelector('[data-frame]')).toBeNull();
  expect(leafOf(screen.container, unframed.slug).querySelector('.on-frame')).toBeNull();
});
