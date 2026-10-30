import { expect, test } from 'vitest';
import type { Review } from '../../src/data/review';
import { reviews } from '../../src/data/reviews';
import { articles, BACK_PATH, buildArticles, pages } from '../../src/pages';
import { excerptOf, headOf, sitemapOf } from '../../src/seo';

function reviewOf(slug: string, date: string): Review {
  return { slug, movie: slug, score: 5, date, hearted: false, text: 'Body.' };
}

const issue = [reviewOf('older', '2026-01-01'), reviewOf('newer', '2026-02-02')];

test('the sitemap lists the cover at the bare domain', () => {
  const sitemap = sitemapOf(buildArticles(issue), issue);

  expect(sitemap).toContain('<loc>https://weekendcritic.com</loc>');
  expect(sitemap).not.toContain('<loc>https://weekendcritic.com/</loc>');
});

test('the sitemap dates a review by its own date', () => {
  const sitemap = sitemapOf(buildArticles(issue), issue);

  expect(sitemap).toContain(
    '<loc>https://weekendcritic.com/reviews/older</loc><lastmod>2026-01-01</lastmod>',
  );
});

test('the sitemap dates the cover and the contents by the newest review', () => {
  const sitemap = sitemapOf(buildArticles(issue), issue);

  expect(sitemap).toContain('<loc>https://weekendcritic.com</loc><lastmod>2026-02-02</lastmod>');
  expect(sitemap).toContain(
    '<loc>https://weekendcritic.com/contents</loc><lastmod>2026-02-02</lastmod>',
  );
});

test('the sitemap leaves the introduction undated', () => {
  const sitemap = sitemapOf(buildArticles(issue), issue);

  expect(sitemap).toContain('<url><loc>https://weekendcritic.com/introduction</loc></url>');
});

test('the sitemap has one entry per article and nothing else', () => {
  const sitemap = sitemapOf(articles, reviews);

  expect(sitemap.match(/<url>/g)).toHaveLength(articles.length);
  expect(articles).toHaveLength(reviews.length + 3);
  expect(sitemap).not.toContain('/back');
  expect(sitemap).not.toContain('/blank');
});

function articleAt(path: string) {
  const page = pages.find((entry) => entry.path === path);
  if (!page) throw new Error(`no page at ${path}`);
  return page.article;
}

test('an excerpt is the opening paragraph, on one line', () => {
  expect(excerptOf('The first\nline.\n\nThe second paragraph.')).toBe('The first line.');
});

test('a long excerpt is cut on a word and says so', () => {
  const excerpt = excerptOf(`${'word '.repeat(60)}end.`);

  expect(excerpt.length).toBeLessThanOrEqual(156);
  expect(excerpt).toMatch(/ word…$/);
});

test('a short excerpt is left whole', () => {
  expect(excerptOf('Short and sweet.')).toBe('Short and sweet.');
});

test('a review is headed with its film, its verdict and its still', () => {
  const [review] = reviews;
  const head = headOf(articleAt(`/reviews/${review.slug}`));

  expect(head.title).toBe(`${review.movie} review: ${review.score}/10 · The Weekend Critic`);
  expect(head.canonical).toBe(`https://weekendcritic.com/reviews/${review.slug}`);
  expect(head.description).toBe(excerptOf(review.text));
  expect(head.published).toBe(review.date);
  expect(head.image).toMatch(/^https:\/\/weekendcritic\.com\//);
  expect(head.noindex).toBe(false);
});

test('the cover is canonical at the bare domain', () => {
  const head = headOf(articleAt('/'));

  expect(head.canonical).toBe('https://weekendcritic.com');
  expect(head.title).toBe('The Weekend Critic: movie reviews by Gabriel Machado');
});

test('the back cover is kept out of the index', () => {
  expect(headOf(articleAt(BACK_PATH)).noindex).toBe(true);
});

test('every article has a title of its own', () => {
  const titles = articles.map((article) => headOf(article).title);

  expect(new Set(titles).size).toBe(titles.length);
});

test('a review that is not in the issue has no head to give', () => {
  expect(() =>
    headOf({ path: '/reviews/nope', label: 'Nope', kind: 'review', slug: 'nope' }),
  ).toThrow('nope');
});
