import { expect, test } from 'vitest';
import { findReview, reviews } from '../../src/data/reviews';

// Importing `reviews` evaluates the glob, which runs the parser over every committed
// JSON file. That is what turns a malformed review into a failing CI run — `vite build`
// would happily ship one and blank the page at runtime.

test('every committed review file parses', () => {
  expect(reviews.length).toBeGreaterThanOrEqual(4);
  expect(reviews.length).toBeLessThanOrEqual(6);
});

test('slugs are unique and URL-safe', () => {
  const slugs = reviews.map((review) => review.slug);

  expect(new Set(slugs).size).toBe(slugs.length);
  for (const slug of slugs) {
    expect(slug).toMatch(/^[a-z0-9-]+$/);
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
