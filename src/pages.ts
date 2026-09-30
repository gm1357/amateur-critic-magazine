import type { Review } from './data/review';
import { reviews } from './data/reviews';

// An article is a piece of the issue's content: the cover, the contents, one review. How
// much *paper* it takes is not a property of the content — it is a fact about the type on
// the page, which only a browser laying it out can report. So articles are what this
// module knows at compile time, and pages are what the composing room makes of them.
export type Article =
  | { path: string; label: string; kind: 'cover' }
  | { path: string; label: string; kind: 'contents' }
  | { path: string; label: string; kind: 'introduction' }
  | { path: string; label: string; kind: 'review'; slug: string }
  | { path: string; label: string; kind: 'blank' }
  | { path: string; label: string; kind: 'back' };

// One leaf of the issue: which article is on it, and which part of that article. `parts`
// travels with the page because a continued article has to know it is continued.
export type Page = {
  path: string;
  label: string;
  article: Article;
  part: number;
  parts: number;
};

export const CONTENTS_PATH = '/contents';
export const INTRODUCTION_PATH = '/introduction';
export const BACK_PATH = '/back';
const BLANK_PATH = '/blank';

export function reviewPath(slug: string): string {
  return `/reviews/${slug}`;
}

// A continued article is addressed by the part of it on the page: the first page keeps the
// article's own URL — so a link to a review is a link to where the review starts — and
// every page after it counts up from two.
export function partPath(article: Article, part: number): string {
  return part === 0 ? article.path : `${article.path}/${part + 1}`;
}

// The contents sits between the cover and the first review, so it is an article of the
// issue like any other — that is what makes it paginate, print and key-navigate for free,
// and what keeps the numbers it lists honest: they are read back out of the same pages.
// The introduction follows it, so the reviews are listed before they are introduced.
export function buildArticles(list: Review[]): Article[] {
  return [
    { path: '/', label: 'Cover', kind: 'cover' },
    { path: CONTENTS_PATH, label: 'Contents', kind: 'contents' },
    { path: INTRODUCTION_PATH, label: 'Introduction', kind: 'introduction' },
    ...list.map((review): Article => ({
      path: reviewPath(review.slug),
      label: review.movie,
      kind: 'review',
      slug: review.slug,
    })),
  ];
}

export const articles: Article[] = buildArticles(reviews);

const BLANK: Article = { path: BLANK_PATH, label: 'Blank', kind: 'blank' };
const BACK: Article = { path: BACK_PATH, label: 'Back cover', kind: 'back' };

// Which articles are allowed to run over. The covers and the blank are compositions rather
// than copy: a cover that outgrew its leaf would be a cover with a second page, which is
// not a thing a magazine has. Everything with a body of text flows.
export function flows(article: Article): boolean {
  return (
    article.kind === 'contents' || article.kind === 'introduction' || article.kind === 'review'
  );
}

export function pagesOf(article: Article, parts: number): Page[] {
  const total = Math.max(1, Math.trunc(parts));

  return Array.from({ length: total }, (_, part) => ({
    path: partPath(article, part),
    label: article.label,
    article,
    part,
    parts: total,
  }));
}

// `parts` is measured rather than declared — see `useTypeset`. Everything downstream reads
// the issue out of the list this returns, so a review that grew a page renumbers the rest
// of the magazine exactly the way inserting a page into `buildArticles` always has.
export function buildPages(list: Article[], parts: (article: Article) => number): Page[] {
  // A cover is one leaf whatever it is given: `flows` is the model's rule about what may
  // be continued, and it holds here rather than in whoever is doing the measuring.
  const body = list.flatMap((article) => pagesOf(article, flows(article) ? parts(article) : 1));

  // The back cover mirrors the front: alone on its own leaf, with nothing to face. The
  // front gets that for free — index 0 has no index -1 to pair with — but the back is
  // whatever index comes after the last page, which pairs it with that page whenever the
  // count so far is even. A blank leaf absorbs that pairing so the back cover itself
  // always lands on an odd index, with no index after it to fill the other side.
  if (body.length % 2 === 0) body.push(...pagesOf(BLANK, 1));
  body.push(...pagesOf(BACK, 1));

  return body;
}

// The issue before the composing room has counted it: every article on a single leaf. It
// is what the magazine renders on its first paint and what a test that does not care about
// typesetting can reach for.
export const pages: Page[] = buildPages(articles, () => 1);

// This list is the whole URL contract of the issue: the router hands over a pathname and
// everything else — which page, which spread, whether it is a page at all — is read back
// out of here. A -1 index is the one signal for "this is not a page of the issue".
export function findPageIndex(list: Page[], pathname: string): number {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return list.findIndex((page) => page.path === normalized);
}

// The printed folio, not the array index: page one is the cover. 0 means "not in the
// issue", which no page of the issue can ever be.
export function findPageNumber(list: Page[], pathname: string): number {
  return findPageIndex(list, pathname) + 1;
}

// Where a pathname was pointing before the issue was re-typeset. Re-measuring can shorten
// an article, and the reader standing on its last page would otherwise be holding a URL the
// issue no longer prints. The stem is the article, and the nearest part of it is where they
// meant to be.
export function nearestPage(list: Page[], pathname: string): Page | undefined {
  const match = /^(.*)\/(\d+)$/.exec(pathname);
  if (!match) return undefined;

  const [, stem, counted] = match;
  const parts = list.filter((page) => page.article.path === stem);
  if (parts.length === 0) return undefined;

  const wanted = Number(counted) - 1;
  return parts[Math.min(Math.max(wanted, 0), parts.length - 1)];
}

// Whether a page is far enough into the issue to be worth marking a way back from. The
// listing itself is not — nor is anything in front of it, which is the cover — so the test
// is "printed after the last leaf of the contents".
//
// Compared by leaf rather than by article, because a contents that ran onto a second leaf
// is still the contents: the reader has not passed it until they are past all of it.
export function isPastContents(list: Page[], page: Page | undefined): boolean {
  if (!page) return false;

  const contents = list.findLastIndex((entry) => entry.article.kind === 'contents');
  return contents >= 0 && findPageIndex(list, page.path) > contents;
}
