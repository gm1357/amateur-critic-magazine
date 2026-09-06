import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews, topReviews } from '../../src/data/reviews';
import { AUTHOR, ISSUE, MAGAZINE_TITLE, STRAPLINE } from '../../src/magazine';
import { BACK_PATH, pages } from '../../src/pages';

const HIGHLIGHTS = 3;

function renderBackCover() {
  return render(
    <MemoryRouter initialEntries={[BACK_PATH]}>
      <App />
    </MemoryRouter>,
  );
}

function leafOf(container: HTMLElement) {
  const leaf = container.querySelector(`[data-page="${BACK_PATH}"]`);
  if (!leaf) throw new Error('the back cover is not on the desk');
  return leaf;
}

test('the back cover carries the masthead and its strapline', async () => {
  const screen = await renderBackCover();

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(MAGAZINE_TITLE);
  await expect.element(screen.getByText(STRAPLINE)).toBeVisible();
});

test('it teases the issue with its best-scored reviews', async () => {
  const screen = await renderBackCover();
  const teased = topReviews(HIGHLIGHTS);

  await expect.element(screen.getByText('Inside this issue')).toBeVisible();

  const titles = screen.getByRole('heading', { level: 2 }).elements();
  expect(titles.map((title) => title.textContent)).toEqual(teased.map((review) => review.movie));

  // One badge per teased review. Every star row on this page is a score, so counting the
  // img roles is counting the verdicts.
  expect(screen.getByRole('img').elements()).toHaveLength(teased.length);
  for (const review of teased) {
    expect(leafOf(screen.container).textContent).toContain(review.movie);
  }

  // The rest of the issue is accounted for rather than left unsaid.
  await expect
    .element(screen.getByText(`…and ${reviews.length - HIGHLIGHTS} more reviews inside`))
    .toBeVisible();
});

// The imprint dates itself from the issue's own reviews, so it cannot drift from what the
// magazine actually contains.
test('the imprint prints the price, the issue and the year of its last review', async () => {
  const screen = await renderBackCover();
  const year = reviews[reviews.length - 1].date.slice(0, 4);

  await expect.element(screen.getByText('Free')).toBeVisible();
  await expect.element(screen.getByText(ISSUE)).toBeVisible();
  await expect.element(screen.getByText(`© ${year} ${AUTHOR}`)).toBeVisible();
});

// The barcode is the shape of a barcode, not a scannable code, so it is hidden from the
// role engine — but the digits under it are the issue's own span and are worth printing.
test('the barcode prints the span of the issue and is not announced', async () => {
  const screen = await renderBackCover();
  const opened = reviews[0].date.replaceAll('-', '');
  const closed = reviews[reviews.length - 1].date.replaceAll('-', '');

  await expect.element(screen.getByText(`${opened} ${closed}`)).toBeVisible();
  expect(
    leafOf(screen.container).querySelector('svg')?.closest('[aria-hidden="true"]'),
  ).not.toBeNull();
});

// This is the printed outside of the magazine. The contents is where the issue is
// navigated from, and a teaser that looked clickable here would be a dead end.
test('nothing on the back cover is a link', async () => {
  const screen = await renderBackCover();

  expect(leafOf(screen.container).querySelectorAll('a')).toHaveLength(0);
});

test('the back cover is the last page of the issue', async () => {
  const screen = await renderBackCover();

  await expect.element(screen.getByText(`${pages.length} / ${pages.length}`)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Next' }).elements()).toHaveLength(0);
});
