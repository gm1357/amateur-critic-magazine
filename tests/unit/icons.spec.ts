import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

// Files in `public/` are served by name and never imported, so a renamed or deleted icon
// does not fail the build — the tab just quietly falls back to the browser's default.
test('every icon index.html links to is in public/', () => {
  const html = readFileSync('index.html', 'utf8');
  const hrefs = [
    ...html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="\/([^"]+)"/g),
  ].map(([, href]) => href);

  expect(hrefs).toEqual(['favicon.ico', 'favicon.svg', 'apple-touch-icon.png']);
  for (const href of hrefs) expect(existsSync(`public/${href}`), href).toBe(true);
});
