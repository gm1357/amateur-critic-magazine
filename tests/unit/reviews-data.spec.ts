import { expect, test } from 'vitest';
import { findReview, reviews } from '../../src/data/reviews';
import { buildPages, findPageIndex, pages } from '../../src/pages';

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

test('the cover is page one and every review follows it', () => {
  expect(buildPages(reviews)[0].path).toBe('/');
  expect(pages.length).toBe(reviews.length + 1);
});

test('findPageIndex maps a pathname to its page', () => {
  expect(findPageIndex(pages, '/')).toBe(0);
  expect(findPageIndex(pages, `/reviews/${reviews[0].slug}`)).toBe(1);
  expect(findPageIndex(pages, `/reviews/${reviews[0].slug}/`)).toBe(1);
});

test('findPageIndex returns -1 for anything outside the issue', () => {
  expect(findPageIndex(pages, '/reviews/not-a-real-movie')).toBe(-1);
  expect(findPageIndex(pages, '/some/random/path')).toBe(-1);
});
