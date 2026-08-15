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
  await expect.element(screen.getByText(review.score.toFixed(1))).toBeVisible();
  await expect.element(screen.getByText(review.text.slice(0, 40), { exact: false })).toBeVisible();
});

test('the page number follows the URL, not the click history', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={[`/reviews/${review.slug}`]}>
      <App />
    </MemoryRouter>,
  );

  await expect.element(screen.getByText(`3 / ${reviews.length + 1}`)).toBeVisible();
});

test('the dateline is human-readable and carries the raw ISO date', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={['/reviews/the-lighthouse']}>
      <App />
    </MemoryRouter>,
  );

  // Pinned to one known review so the formatted string can be asserted literally.
  // The datetime attribute is checked on the same element, which is what machines read.
  await expect.element(screen.getByText('22 March 2026')).toHaveAttribute('datetime', '2026-03-22');
});
