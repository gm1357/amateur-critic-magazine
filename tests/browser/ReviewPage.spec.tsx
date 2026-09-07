import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { folioOf, openAt, totalOf } from './issue';

// Expectations are derived from the real `reviews` array so that editing a JSON file
// does not break tests that are not about that review.
const review = reviews[1];
const hearted = reviews.find((entry) => entry.hearted)!;
const plain = reviews.find((entry) => !entry.hearted)!;

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
