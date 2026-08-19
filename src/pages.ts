import type { Review } from './data/review';
import { reviews } from './data/reviews';

// The kind is what lets a page be rendered from the model alone rather than from a
// matched route — the magazine has to be able to put any page on screen, not just the
// one the URL points at.
export type Page =
  | { path: string; label: string; kind: 'cover' }
  | { path: string; label: string; kind: 'contents' }
  | { path: string; label: string; kind: 'review'; slug: string };

export const CONTENTS_PATH = '/contents';

export function reviewPath(slug: string): string {
  return `/reviews/${slug}`;
}

// The contents sits between the cover and the first review, so it is a page of the issue
// like any other — that is what makes it paginate, print and key-navigate for free, and
// what keeps the numbers it lists honest: they are read back out of this same list.
export function buildPages(list: Review[]): Page[] {
  return [
    { path: '/', label: 'Cover', kind: 'cover' },
    { path: CONTENTS_PATH, label: 'Contents', kind: 'contents' },
    ...list.map((review): Page => ({
      path: reviewPath(review.slug),
      label: review.movie,
      kind: 'review',
      slug: review.slug,
    })),
  ];
}

export const pages: Page[] = buildPages(reviews);

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
