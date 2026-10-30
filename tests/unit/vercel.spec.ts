import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { articles, flows, partPath } from '../../src/pages';

type Rewrite = { source: string; destination: string };

const { buildCommand, rewrites } = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  buildCommand: string;
  rewrites: Rewrite[];
};

function pattern(source: string): RegExp {
  const params = source.replace(/:\w+\(\\d\+\)/g, '\\d+').replace(/:\w+/g, '[^/]+');
  return new RegExp(`^${params}$`);
}

function rewritten(path: string): boolean {
  return rewrites.some(({ source }) => pattern(source).test(path));
}

// Without the prerender step there are no article files, and nothing rewrites to a shell any
// more: every page of the issue would be a 404.
test('the host runs the build that prints the issue', () => {
  const { build } = (
    JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: { build: string } }
  ).scripts;

  expect(buildCommand).toBe('npm run build');
  expect(build).toContain('scripts/prerender.js');
});

// The number of parts is measured in a browser, so the host cannot have a file for them: every
// article that may run on needs a rewrite, or its second page is a 404 on a hard reload.
test('every article that may run on has its continued pages rewritten', () => {
  for (const article of articles.filter(flows)) {
    expect(rewritten(partPath(article, 1)), article.path).toBe(true);
  }
});

test('a page that cannot continue falls through to the 404', () => {
  expect(rewritten('/2')).toBe(false);
  expect(rewritten('/back/2')).toBe(false);
  expect(rewritten('/reviews/heat/two')).toBe(false);
});

test('nothing rewrites the whole site, which would make every missing page a 200', () => {
  expect(rewritten('/reviews/heat')).toBe(false);
  expect(rewritten('/never-printed')).toBe(false);
});
