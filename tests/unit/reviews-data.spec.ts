import { expect, test } from 'vitest';
import { findReview, reviews, topReviews } from '../../src/data/reviews';
import type { Review } from '../../src/data/review';
import {
  BACK_PATH,
  buildPages,
  CONTENTS_PATH,
  findPageIndex,
  findPageNumber,
  pages,
} from '../../src/pages';
import { anchorOf, spreadAt, spreadOf } from '../../src/spread';

// buildPages only reads slug and movie off a review, so a fake one only needs to look
// like one — the rest of the fields are irrelevant to pagination.
function reviewOf(slug: string): Review {
  return { slug, movie: slug, score: 5, date: '2026-01-01', hearted: false, text: 'Body.' };
}

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

// The back cover teases the issue by verdict. Asserted as properties rather than against
// the films that happen to be committed, which change every time one is added.
test('topReviews takes the best-scored reviews, highest first', () => {
  const top = topReviews(3);

  expect(top).toHaveLength(3);
  expect(top[0].score).toBe(Math.max(...reviews.map((review) => review.score)));

  for (const [index, review] of top.slice(1).entries()) {
    expect(review.score).toBeLessThanOrEqual(top[index].score);
  }

  // Nothing left off the back cover scored better than what made it.
  const missed = reviews.filter((review) => !top.includes(review));
  expect(Math.max(...missed.map((review) => review.score))).toBeLessThanOrEqual(top[2].score);
});

// Three nines have to come out in the same sequence on every machine that builds the
// issue, or the back cover teases different films in CI than it does locally.
test('topReviews breaks ties by issue order, not by glob order', () => {
  const top = topReviews(reviews.length);

  for (const [index, review] of top.slice(1).entries()) {
    const previous = top[index];
    if (previous.score !== review.score) continue;

    // Same score: the older review leads, and two on one date fall back to the slug.
    expect(previous.date < review.date || previous.slug.localeCompare(review.slug) < 0).toBe(true);
  }
});

test('topReviews cannot ask for more reviews than the issue has', () => {
  expect(topReviews(reviews.length + 5)).toHaveLength(reviews.length);
  expect(topReviews(0)).toEqual([]);
});

test('findReview looks up by slug and misses cleanly', () => {
  expect(findReview(reviews[0].slug)).toBe(reviews[0]);
  expect(findReview('not-a-real-movie')).toBeUndefined();
  expect(findReview(undefined)).toBeUndefined();
});

test('the cover is page one, the contents page two, and every review follows', () => {
  const built = buildPages(reviews);
  const body = built.slice(2, 2 + reviews.length);

  expect(built[0].path).toBe('/');
  expect(built[1].path).toBe(CONTENTS_PATH);
  expect(body.map((page) => page.label)).toEqual(reviews.map((review) => review.movie));
});

// Every page carries what it takes to render it, so the magazine can put a page on
// screen without the router having matched it.
test('every page knows what kind of page it is', () => {
  const built = buildPages(reviews);
  const body = built.slice(2, 2 + reviews.length);

  expect(built[0].kind).toBe('cover');
  expect(built[1].kind).toBe('contents');
  expect(body.map((page) => page.kind)).toEqual(reviews.map(() => 'review'));
  expect(body.map((page) => (page.kind === 'review' ? page.slug : undefined))).toEqual(
    reviews.map((review) => review.slug),
  );
});

// The back cover mirrors the front: alone on its own leaf, with nothing to face. The
// front gets that for free from array bounds; the back needs a blank leaf ahead of it
// whenever the reviews alone would leave it sharing a spread with the last one.
test('the back cover is always the last page, and it is always alone', () => {
  expect(pages.at(-1)?.path).toBe(BACK_PATH);

  for (const mode of ['single', 'spread'] as const) {
    const index = findPageIndex(pages, BACK_PATH);
    const spread = spreadOf(mode, index);
    const { left, right } = spreadAt(mode, pages, spread);

    expect([left, right]).toContain(pages.at(-1));
    expect([left, right].find((page) => page !== pages.at(-1))).toBeUndefined();
  }
});

// The parity of cover + contents + reviews decides whether a blank leaf is needed to
// keep the back cover isolated: an odd count of reviews behind it needs one, an even
// count already leaves the back cover with nothing to pair against.
test('a blank leaf appears only when the reviews alone would pair with the back cover', () => {
  const odd = buildPages([reviewOf('one')]);
  const even = buildPages([reviewOf('one'), reviewOf('two')]);

  expect(odd.map((page) => page.kind)).toEqual(['cover', 'contents', 'review', 'back']);
  expect(even.map((page) => page.kind)).toEqual([
    'cover',
    'contents',
    'review',
    'review',
    'blank',
    'back',
  ]);

  for (const built of [odd, even]) {
    const back = findPageIndex(built, BACK_PATH);
    expect(spreadAt('spread', built, spreadOf('spread', back)).right).toBeUndefined();
  }
});

// anchorOf has to be a right inverse of spreadOf for the back cover's spread too, or
// following the last contents entry lands on a URL that immediately turns again.
test('the back cover spread is addressed by the back cover itself', () => {
  const spread = spreadOf('spread', findPageIndex(pages, BACK_PATH));
  expect(anchorOf('spread', pages, spread)?.path).toBe(BACK_PATH);
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
