import type { Review } from './data/review';
import { reviews } from './data/reviews';

export type Page = {
  path: string;
  label: string;
};

export function buildPages(list: Review[]): Page[] {
  return [
    { path: '/', label: 'Cover' },
    ...list.map((review) => ({ path: `/reviews/${review.slug}`, label: review.movie })),
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
