import { render } from 'vitest-browser-react';
import { beforeEach, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { renderPage } from '../../src/entry-server';
import { pages, reviewPath } from '../../src/pages';
import { clearPrintedHead, headOf } from '../../src/seo';

const [first] = reviews;
const longest = [...reviews].sort((a, b) => b.text.length - a.text.length)[0];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function headTags(selector: string) {
  return document.head.querySelectorAll(selector);
}

function canonical() {
  return headTags('link[rel="canonical"]')[0]?.getAttribute('href');
}

// The page the suite runs in has a title of its own, which is not the magazine's to manage.
beforeEach(() => {
  for (const tag of headTags('title')) tag.remove();
});

// What the browser has in its head when `main.tsx` starts: the page the build printed.
function printHeadOf(path: string) {
  const page = pages.find((entry) => entry.path === path)!;
  const shell = `<html><head><title data-printed></title></head><body><div id="root"></div></body></html>`;
  const printed = new DOMParser().parseFromString(renderPage(shell, page), 'text/html');

  document.head.append(...printed.head.children);
}

test('the title and canonical follow the page', async () => {
  const screen = await renderAt('/');

  await expect.poll(() => document.title).toBe(headOf(pages[0].article).title);

  await screen.getByRole('link', { name: 'Next' }).click();

  await expect.poll(() => document.title).toBe('Contents · The Weekend Critic');
  await expect.poll(canonical).toBe('https://weekendcritic.com/contents');
});

test('the head holds one of each tag, however the page got there', async () => {
  const screen = await renderAt('/');

  await screen.getByRole('link', { name: 'Next' }).click();
  await expect.poll(() => document.title).toBe('Contents · The Weekend Critic');

  expect(headTags('title')).toHaveLength(1);
  expect(headTags('meta[name="description"]')).toHaveLength(1);
  expect(headTags('link[rel="canonical"]')).toHaveLength(1);
  expect(headTags('meta[property="og:title"]')).toHaveLength(1);
});

test('what the build printed does not outlive the magazine taking over', async () => {
  const path = reviewPath(first.slug);

  printHeadOf(path);
  clearPrintedHead(document.head);

  const screen = await renderAt(path);
  const { title } = headOf(pages.find((page) => page.path === path)!.article);
  await expect.poll(() => document.title).toBe(title);

  expect(headTags('title')).toHaveLength(1);
  expect(headTags('meta[name="description"]')).toHaveLength(1);
  expect(headTags('link[rel="canonical"]')).toHaveLength(1);
  expect(headTags('meta[property="og:image"]')).toHaveLength(1);
  expect(headTags('meta[property="article:published_time"]')).toHaveLength(1);

  await screen.getByRole('link', { name: 'Next' }).click();

  await expect.poll(() => document.title).not.toBe(title);
  expect(headTags('link[rel="canonical"]')).toHaveLength(1);
  expect(canonical()).not.toBe(`https://weekendcritic.com${path}`);
});

test('a continued page points back at the start of its article', async () => {
  const path = reviewPath(longest.slug);

  await renderAt(`${path}/2`);

  await expect.poll(canonical).toBe(`https://weekendcritic.com${path}`);
  expect(headTags('meta[name="robots"]')).toHaveLength(0);
});

test('a missing page says so and stays out of the index', async () => {
  const screen = await renderAt('/reviews/never-printed');

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('This page was never printed');
  await expect.poll(() => document.title).toBe('Page not found · The Weekend Critic');
  expect(headTags('meta[name="robots"]')[0].getAttribute('content')).toBe('noindex');
});
