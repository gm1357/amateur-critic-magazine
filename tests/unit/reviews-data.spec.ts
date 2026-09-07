import { expect, test } from 'vitest';
import { findReview, reviews, topReviews } from '../../src/data/reviews';
import type { Review } from '../../src/data/review';
import {
  type Article,
  BACK_PATH,
  buildArticles,
  buildPages,
  CONTENTS_PATH,
  findPageIndex,
  findPageNumber,
  nearestPage,
  pages,
  reviewPath,
} from '../../src/pages';
import { anchorOf, spreadAt, spreadOf } from '../../src/spread';

// buildArticles only reads slug and movie off a review, so a fake one only needs to look
// like one — the rest of the fields are irrelevant to pagination.
function reviewOf(slug: string): Review {
  return { slug, movie: slug, score: 5, date: '2026-01-01', hearted: false, text: 'Body.' };
}

// The issue as it comes off a composing room that found everything fits on one leaf.
function singles(list: Review[]) {
  return buildPages(buildArticles(list), () => 1);
}

function kindsOf(list: { article: Article }[]): string[] {
  return list.map((page) => page.article.kind);
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
  const built = singles(reviews);
  const body = built.slice(2, 2 + reviews.length);

  expect(built[0].path).toBe('/');
  expect(built[1].path).toBe(CONTENTS_PATH);
  expect(body.map((page) => page.label)).toEqual(reviews.map((review) => review.movie));
});

// Every page carries what it takes to render it, so the magazine can put a page on
// screen without the router having matched it.
test('every page knows what kind of page it is', () => {
  const built = singles(reviews);
  const body = built.slice(2, 2 + reviews.length);

  expect(built[0].article.kind).toBe('cover');
  expect(built[1].article.kind).toBe('contents');
  expect(kindsOf(body)).toEqual(reviews.map(() => 'review'));
  expect(
    body.map((page) => (page.article.kind === 'review' ? page.article.slug : undefined)),
  ).toEqual(reviews.map((review) => review.slug));
});

// An article that outruns its leaf is continued on the next one, and the pages it is
// continued onto are pages of the issue like any other: they are printed, numbered, and
// addressed by a URL.
test('an article that runs over becomes as many pages as it takes', () => {
  const list = buildArticles([reviewOf('one'), reviewOf('two')]);
  const built = buildPages(list, (article) => (article.path === reviewPath('one') ? 3 : 1));

  const continued = built.filter((page) => page.article.path === reviewPath('one'));
  expect(continued.map((page) => page.path)).toEqual([
    '/reviews/one',
    '/reviews/one/2',
    '/reviews/one/3',
  ]);
  expect(continued.map((page) => page.part)).toEqual([0, 1, 2]);
  expect(continued.every((page) => page.parts === 3)).toBe(true);

  // A review that grew a page pushes everything printed after it along.
  expect(findPageNumber(built, reviewPath('one'))).toBe(3);
  expect(findPageNumber(built, reviewPath('two'))).toBe(6);
});

// The first page of an article keeps the article's own URL, so a link into the issue is a
// link to where the piece starts rather than to a page number that moves.
test('the first page of an article is the article', () => {
  const built = buildPages(buildArticles([reviewOf('one')]), () => 4);

  expect(built[0].path).toBe('/');
  expect(findPageIndex(built, CONTENTS_PATH)).toBe(1);
  expect(findPageIndex(built, `${CONTENTS_PATH}/4`)).toBe(4);
  expect(findPageIndex(built, `${CONTENTS_PATH}/5`)).toBe(-1);
});

// Re-typesetting can shorten an article, and a reader standing on a page it no longer has
// is not on a missing page — they are on the same article, nearer its end.
test('a page a shortened article no longer has falls back to its last', () => {
  const built = buildPages(buildArticles([reviewOf('one')]), () => 2);

  expect(nearestPage(built, '/reviews/one/2')?.path).toBe('/reviews/one/2');
  expect(nearestPage(built, '/reviews/one/9')?.path).toBe('/reviews/one/2');
  expect(nearestPage(built, '/reviews/nobody/2')).toBeUndefined();
  expect(nearestPage(built, '/reviews/one')).toBeUndefined();
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

// The parity of everything printed ahead of it decides whether a blank leaf is needed to
// keep the back cover isolated — and it is a parity of *leaves*, so an article that ran
// over is what decides it just as much as one that was added.
test('a blank leaf appears only when the pages ahead would pair with the back cover', () => {
  const odd = singles([reviewOf('one')]);
  const even = singles([reviewOf('one'), reviewOf('two')]);

  // The same odd issue again, with the one review continued onto a second leaf: the extra
  // page flips the parity, so this time the blank is the one that is not needed.
  const continued = buildPages(buildArticles([reviewOf('one')]), (article) =>
    article.path === reviewPath('one') ? 2 : 1,
  );

  expect(kindsOf(odd)).toEqual(['cover', 'contents', 'review', 'back']);
  expect(kindsOf(even)).toEqual(['cover', 'contents', 'review', 'review', 'blank', 'back']);
  expect(kindsOf(continued)).toEqual(['cover', 'contents', 'review', 'review', 'blank', 'back']);

  for (const built of [odd, even, continued]) {
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
