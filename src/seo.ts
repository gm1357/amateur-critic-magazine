import type { Review } from './data/review';
import { SITE_URL } from './magazine';
import type { Article } from './pages';

function absolute(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

// When an article last changed, as far as the issue knows. A review is as old as its own
// date, and the cover and the contents change whenever a review is added. The introduction
// is not dated, and a sitemap is better off saying nothing than guessing.
function lastModified(article: Article, issue: Review[]): string | undefined {
  if (article.kind === 'review') {
    return issue.find((review) => review.slug === article.slug)?.date;
  }
  if (article.kind === 'cover' || article.kind === 'contents') {
    return issue
      .map((review) => review.date)
      .sort()
      .at(-1);
  }
  return undefined;
}

// Articles rather than pages: how many leaves an article runs to is only known in a browser,
// and a continued page is the same copy as the page its article starts on.
export function sitemapOf(list: Article[], issue: Review[]): string {
  const urls = list.map((article) => {
    const modified = lastModified(article, issue);
    const lastmod = modified ? `<lastmod>${modified}</lastmod>` : '';

    return `  <url><loc>${absolute(article.path)}</loc>${lastmod}</url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
