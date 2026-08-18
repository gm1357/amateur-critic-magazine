import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { CONTENTS_PATH, pages } from '../../src/pages';

function renderContents() {
  return render(
    <MemoryRouter initialEntries={[CONTENTS_PATH]}>
      <App />
    </MemoryRouter>,
  );
}

test('the contents lists every review in the issue, in page order', async () => {
  const screen = await renderContents();

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contents');

  const titles = screen.getByRole('heading', { level: 2 }).elements();
  expect(titles.map((title) => title.textContent)).toEqual(reviews.map((review) => review.movie));
});

// Scores and dates repeat across the issue, so every claim here is made against the
// entry it belongs to rather than against the page as a whole.
test('each entry links to its review and shows its score and date', async () => {
  const screen = await renderContents();

  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  const entries = screen.getByRole('listitem').elements();

  expect(entries).toHaveLength(reviews.length);
  entries.forEach((entry, index) => {
    const review = reviews[index];

    expect(entry.querySelector('a')?.getAttribute('href')).toBe(`/reviews/${review.slug}`);
    expect(entry.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      `${review.score} out of 10`,
    );
    expect(entry.querySelector('time')?.getAttribute('datetime')).toBe(review.date);
  });
});

test('following an entry opens that review', async () => {
  const screen = await renderContents();
  const review = reviews[reviews.length - 1];

  await screen.getByRole('link', { name: review.movie }).click();

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(review.movie);
  await expect.element(screen.getByText(`${pages.length} / ${pages.length}`)).toBeVisible();
});

test('the contents is page two and carries the magazine chrome', async () => {
  const screen = await renderContents();

  await expect.element(screen.getByText(`2 / ${pages.length}`)).toBeVisible();
  await expect.element(screen.getByRole('link', { name: 'Previous' })).toBeVisible();
  await expect.element(screen.getByRole('link', { name: 'Next' })).toBeVisible();
});
