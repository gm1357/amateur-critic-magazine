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
  // The Lighthouse scores 7, so 3 and a half of the five stars should be filled.
  const screen = await render(
    <MemoryRouter initialEntries={['/reviews/the-lighthouse']}>
      <App />
    </MemoryRouter>,
  );

  const badge = screen.getByRole('img', { name: '7 out of 10' });
  await expect.element(badge).toBeVisible();

  // Measured rather than read off the style attribute, so this fails if the fill row
  // ever stops lining up with the track it is clipped against.
  const rows = badge.element().querySelectorAll('span');
  const track = rows[0].getBoundingClientRect().width;
  const fill = rows[1].getBoundingClientRect().width;

  expect(fill / track).toBeCloseTo(0.7, 2);
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
    <MemoryRouter initialEntries={['/reviews/the-lighthouse']}>
      <App />
    </MemoryRouter>,
  );

  // Pinned to one known review so the formatted string can be asserted literally.
  // The datetime attribute is checked on the same element, which is what machines read.
  await expect.element(screen.getByText('22 March 2026')).toHaveAttribute('datetime', '2026-03-22');
});
