import type { Review } from './data/review';
import { reviews } from './data/reviews';

export type Page = {
  path: string;
  label: string;
};

export const CONTENTS_PATH = '/contents';

export function reviewPath(slug: string): string {
  return `/reviews/${slug}`;
}

// The contents sits between the cover and the first review, so it is a page of the issue
// like any other — that is what makes it paginate, print and key-navigate for free, and
// what keeps the numbers it lists honest: they are read back out of this same list.
export function buildPages(list: Review[]): Page[] {
  return [
    { path: '/', label: 'Cover' },
    { path: CONTENTS_PATH, label: 'Contents' },
    ...list.map((review) => ({ path: reviewPath(review.slug), label: review.movie })),
  ];
}

export const pages: Page[] = buildPages(reviews);

// The layout is a pathless route, so useParams() there cannot see the child's :slug.
// Matching the pathname against an ordered page list keeps pagination a pure function
// and gives one signal — a -1 index — for "this is not a page of the issue".
export function findPageIndex(list: Page[], pathname: string): number {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return list.findIndex((page) => page.path === normalized);
}

// The printed folio, not the array index: page one is the cover. 0 means "not in the
// issue", which no page of the issue can ever be.
export function findPageNumber(list: Page[], pathname: string): number {
  return findPageIndex(list, pathname) + 1;
}
