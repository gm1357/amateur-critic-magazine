import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { CONTENTS_PATH } from '../../src/pages';
import { folioOf, totalOf } from './issue';

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

  // Scoped to the contents itself: on a wide desk the first review is the facing page,
  // and its badge is legitimately on screen.
  const contents = screen.container.querySelector(`[data-page="${CONTENTS_PATH}"]`)!;

  expect(contents.querySelectorAll('[role="img"]')).toHaveLength(0);
  for (const review of reviews) {
    expect(contents.textContent).not.toContain(`${review.score} out of 10`);
  }
});

// The folios climb with the listing, and every one of them is a page this issue has. What
// they cannot be is written down here: an article that ran over moved everything printed
// after it, which is exactly the thing this has to keep honest.
test('the folios beside the titles run in order and stay inside the issue', async () => {
  const screen = await renderContents();

  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  const entries = screen.getByRole('listitem').elements();
  const total = totalOf(screen.container);

  const folios = entries.map((entry) =>
    Number(entry.querySelector('span.tabular-nums')?.textContent?.trim()),
  );

  expect(folios).toHaveLength(reviews.length);
  for (const [index, folio] of folios.entries()) {
    // Past the cover and this listing, inside the back cover, and never behind the review
    // before it.
    expect(folio).toBeGreaterThan(2);
    expect(folio).toBeLessThan(total);
    if (index > 0) expect(folio).toBeGreaterThan(folios[index - 1]);
  }
});

// The listing is a promise about where a review is. Following it has to land on that page,
// or the numbers printed beside the titles are decoration.
test('following an entry opens that review, on the page the listing gave it', async () => {
  const screen = await renderContents();
  const review = reviews[reviews.length - 1];

  const entry = screen
    .getByRole('listitem')
    .elements()
    .find((item) => item.textContent?.includes(review.movie))!;
  const listed = entry.querySelector('span.tabular-nums')?.textContent?.trim();

  await screen.getByRole('link', { name: review.movie }).click();

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(review.movie);
  await expect.poll(() => folioOf(screen.container)).toBe(listed);
});

test('the contents is page two and carries the magazine chrome', async () => {
  const screen = await renderContents();

  await expect.poll(() => folioOf(screen.container)).toBe('2');
  await expect.element(screen.getByRole('link', { name: 'Previous' })).toBeVisible();
  await expect.element(screen.getByRole('link', { name: 'Next' })).toBeVisible();
});

// A listing longer than a page is continued on the next one, the way any article is.
test('a contents too long for one leaf runs on to the next', async () => {
  const screen = await renderContents();
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const listing = screen.container.querySelector(`[data-page="${CONTENTS_PATH}"] .page-flow`)!;
  const window_ = listing.parentElement!;

  // The listing is wider than the window it is read through: the rest of it is on other
  // leaves, not behind a scrollbar.
  expect(listing.scrollWidth).toBeGreaterThan(window_.clientWidth);
  expect(window_.scrollHeight).toBe(window_.clientHeight);
});
