import { expect, test } from 'vitest';
import type { Review } from '../../src/data/review';
import { reviews } from '../../src/data/reviews';
import { articles, buildArticles } from '../../src/pages';
import { sitemapOf } from '../../src/seo';

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
