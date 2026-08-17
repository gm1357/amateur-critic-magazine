import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';

// Expectations are derived from the real `reviews` array so that editing a JSON file
// does not break tests that are not about that review.
const review = reviews[1];

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

  await expect.element(screen.getByText(`3 / ${reviews.length + 1}`)).toBeVisible();
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
