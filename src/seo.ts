import { frameOf } from './data/frames';
import type { Review } from './data/review';
import { findReview } from './data/reviews';
import { AUTHOR, MAGAZINE_TITLE, SITE_URL } from './magazine';
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

// React only adopts tags already in the head when it hydrates, and the magazine replaces what
// the build printed rather than hydrating it. Left alone they would sit beside React's own
// for good, the first of each winning and never changing, so they go before it renders.
export function clearPrintedHead(head: ParentNode): void {
  for (const tag of head.querySelectorAll('[data-printed]')) tag.remove();
}

export type Head = {
  canonical: string;
  description: string;
  image?: string;
  noindex: boolean;
  published?: string;
  title: string;
};

const DESCRIPTION_LENGTH = 155;
const COVER_DESCRIPTION = `Movie reviews by ${AUTHOR}, set as a magazine you can page through.`;

// The opening of a review stands in for it in a search result, cut on a word so a snippet
// never ends in half of one. The review's own first paragraph is the natural length of it.
export function excerptOf(text: string): string {
  const opening = text
    .split(/\n{2,}/)[0]
    .replace(/\s+/g, ' ')
    .trim();
  if (opening.length <= DESCRIPTION_LENGTH) return opening;

  const cut = opening.slice(0, DESCRIPTION_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.]+$/, '')}…`;
}

function reviewHead(article: Article, review: Review): Head {
  const frame = frameOf(review.slug);

  return {
    canonical: absolute(article.path),
    description: excerptOf(review.text),
    image: frame && absolute(frame),
    noindex: false,
    published: review.date,
    title: `${review.movie} review: ${review.score}/10 · ${MAGAZINE_TITLE}`,
  };
}

// The head belongs to the article rather than the page: a continued page is the same copy
// under a further URL, so it is every part of the article that points back at the first.
export function headOf(article: Article): Head {
  const canonical = absolute(article.path);

  switch (article.kind) {
    case 'cover':
      return {
        canonical,
        description: COVER_DESCRIPTION,
        noindex: false,
        title: `${MAGAZINE_TITLE}: movie reviews by ${AUTHOR}`,
      };
    case 'contents':
      return {
        canonical,
        description: `Every movie reviewed in ${MAGAZINE_TITLE}, in the order they were published.`,
        noindex: false,
        title: `Contents · ${MAGAZINE_TITLE}`,
      };
    case 'introduction':
      return {
        canonical,
        description: `What ${MAGAZINE_TITLE} is, who writes it, and why it is a virtual magazine.`,
        noindex: false,
        title: `Introduction · ${MAGAZINE_TITLE}`,
      };
    case 'review': {
      const review = findReview(article.slug);

      // As in `ReviewPage`: the model builds these from reviews, but the link is a slug.
      if (!review) throw new Error(`No review has the slug "${article.slug}"`);
      return reviewHead(article, review);
    }
    // Part of the object in a reader's hands, and worth nothing as a search result.
    case 'blank':
    case 'back':
      return {
        canonical,
        description: COVER_DESCRIPTION,
        noindex: true,
        title: `${article.label} · ${MAGAZINE_TITLE}`,
      };
  }
}
