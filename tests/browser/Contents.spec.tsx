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

// Dates repeat across the issue, so every claim here is made against the entry it
// belongs to rather than against the page as a whole.
test('each entry links to its review and dates it', async () => {
  const screen = await renderContents();

  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  const entries = screen.getByRole('listitem').elements();

  expect(entries).toHaveLength(reviews.length);
  entries.forEach((entry, index) => {
    const review = reviews[index];

    expect(entry.querySelector('a')?.getAttribute('href')).toBe(`/reviews/${review.slug}`);
    expect(entry.querySelector('time')?.getAttribute('datetime')).toBe(review.date);
  });
});

// The score is the review's verdict and stays on the review's own page. ScoreBadge is
// the only thing in the issue carrying an img role, so its absence is the assertion.
test('the contents does not give the scores away', async () => {
  const screen = await renderContents();

  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  expect(screen.getByRole('img').elements()).toHaveLength(0);
  for (const review of reviews) {
    expect(screen.getByText(`${review.score} out of 10`).elements()).toHaveLength(0);
  }
});

test('the folio beside each title is the page the review is actually on', async () => {
  const screen = await renderContents();

  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  const entries = screen.getByRole('listitem').elements();

  // The first review is page three: the cover, then this page, then the reviews.
  entries.forEach((entry, index) => {
    expect(entry.textContent).toContain(String(index + 3));
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
