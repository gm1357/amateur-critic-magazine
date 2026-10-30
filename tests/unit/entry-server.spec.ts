import { expect, test } from 'vitest';
import { reviews } from '../../src/data/reviews';
import { pages, reviewPath } from '../../src/pages';
import { renderPage } from '../../src/entry-server';

const SHELL = `<html><head><title data-printed>The Weekend Critic</title></head><body><div id="root"></div></body></html>`;

function pageAt(path: string) {
  const page = pages.find((entry) => entry.path === path);
  if (!page) throw new Error(`no page at ${path}`);
  return page;
}

// React escapes apostrophes and the like, so the copy is searched for one line of it with
// nothing in it to escape.
function plainWords(text: string): string {
  return text.split(/[^\w ]+/).reduce((a, b) => (b.length > a.length ? b : a));
}

test('a review is printed with every paragraph of its copy', () => {
  const longest = [...reviews].sort((a, b) => b.text.length - a.text.length)[0];
  const html = renderPage(SHELL, pageAt(reviewPath(longest.slug)));

  for (const paragraph of longest.text.split(/\n{2,}/)) {
    expect(html).toContain(plainWords(paragraph));
  }
});

test('a printed page has one heading and takes the title out of the shell', () => {
  const [review] = reviews;
  const html = renderPage(SHELL, pageAt(reviewPath(review.slug)));

  expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  expect(html.match(/<title[\s>]/g)).toHaveLength(1);
  expect(html).not.toContain('>The Weekend Critic</title>');
});

test('a printed page names its own canonical URL', () => {
  const [review] = reviews;
  const html = renderPage(SHELL, pageAt(reviewPath(review.slug)));

  expect(html).toContain(`href="https://weekendcritic.com/reviews/${review.slug}"`);
});

test('every tag printed into the head is marked for the client to clear', () => {
  const html = renderPage(SHELL, pageAt('/'));
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));

  expect(head.match(/<(title|meta|link)\b/g)?.length).toBeGreaterThan(5);
  expect(head.match(/<(title|meta|link) data-printed\b/g)).toHaveLength(
    head.match(/<(title|meta|link)\b/g)!.length,
  );
});

test('the head lands in the head and the page in the root', () => {
  const html = renderPage(SHELL, pageAt('/contents'));

  expect(html.indexOf('rel="canonical"')).toBeLessThan(html.indexOf('</head>'));
  expect(html.indexOf('data-page="/contents"')).toBeGreaterThan(html.indexOf('<div id="root">'));
});

test('the contents links to every review', () => {
  const html = renderPage(SHELL, pageAt('/contents'));

  for (const review of reviews) {
    expect(html).toContain(`href="${reviewPath(review.slug)}"`);
  }
});

test('a review carries its data as JSON the page cannot break out of', () => {
  const [review] = reviews;
  const html = renderPage(SHELL, pageAt(reviewPath(review.slug)));
  const [, json] = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)!;

  expect(json).not.toContain('<');
  expect(JSON.parse(json)['@type']).toBe('Review');
  expect(html.indexOf('application/ld+json')).toBeLessThan(html.indexOf('</head>'));
});

test('the data is left in place when the client clears the printed head', () => {
  const [review] = reviews;
  const html = renderPage(SHELL, pageAt(reviewPath(review.slug)));

  expect(html).not.toMatch(/<script[^>]*data-printed/);
});

test('a shell with nowhere to print is a failed build', () => {
  expect(() => renderPage('<html></html>', pageAt('/'))).toThrow('The HTML shell has no');
});
