import { expect, test } from 'vitest';
import { findReview, reviews } from '../../src/data/reviews';
import { buildPages, CONTENTS_PATH, findPageIndex, findPageNumber, pages } from '../../src/pages';

// Importing `reviews` evaluates the glob, which runs the parser over every committed
// JSON file. That is what turns a malformed review into a failing CI run — `vite build`
// would happily ship one and blank the page at runtime.

test('every committed review file parses', () => {
  expect(reviews.length).toBeGreaterThan(0);
});

test('slugs are unique and URL-safe', () => {
  const slugs = reviews.map((review) => review.slug);

  expect(new Set(slugs).size).toBe(slugs.length);
  for (const slug of slugs) {
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  }
});

test('every score is a whole number from 1 to 10', () => {
  for (const review of reviews) {
    expect(Number.isInteger(review.score)).toBe(true);
    expect(review.score).toBeGreaterThanOrEqual(1);
    expect(review.score).toBeLessThanOrEqual(10);
  }
});

test('reviews run oldest first', () => {
  const dates = reviews.map((review) => review.date);

  expect(dates).toEqual([...dates].sort());
});

test('findReview looks up by slug and misses cleanly', () => {
  expect(findReview(reviews[0].slug)).toBe(reviews[0]);
  expect(findReview('not-a-real-movie')).toBeUndefined();
  expect(findReview(undefined)).toBeUndefined();
});

test('the cover is page one, the contents page two, and every review follows', () => {
  const built = buildPages(reviews);

  expect(built[0].path).toBe('/');
  expect(built[1].path).toBe(CONTENTS_PATH);
  expect(built.slice(2).map((page) => page.label)).toEqual(reviews.map((review) => review.movie));
  expect(pages.length).toBe(reviews.length + 2);
});

test('findPageIndex maps a pathname to its page', () => {
  expect(findPageIndex(pages, '/')).toBe(0);
  expect(findPageIndex(pages, CONTENTS_PATH)).toBe(1);
  expect(findPageIndex(pages, `/reviews/${reviews[0].slug}`)).toBe(2);
  expect(findPageIndex(pages, `/reviews/${reviews[0].slug}/`)).toBe(2);
});

// The contents prints these numbers, so a folio that disagreed with the pager would put
// the wrong page number next to every title on it.
test('findPageNumber is the printed folio, counting from one', () => {
  expect(findPageNumber(pages, '/')).toBe(1);
  expect(findPageNumber(pages, CONTENTS_PATH)).toBe(2);
  expect(findPageNumber(pages, `/reviews/${reviews[0].slug}`)).toBe(3);
  expect(findPageNumber(pages, '/some/random/path')).toBe(0);
});

test('findPageIndex returns -1 for anything outside the issue', () => {
  expect(findPageIndex(pages, '/reviews/not-a-real-movie')).toBe(-1);
  expect(findPageIndex(pages, '/some/random/path')).toBe(-1);
});
