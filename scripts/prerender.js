import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pages, renderPage, sitemap } from '../dist-ssr/entry-server.js';

const shell = await readFile('dist/index.html', 'utf8');

function fileOf(path) {
  return path === '/' ? 'dist/index.html' : `dist${path}.html`;
}

// Everything a page can get wrong without failing to render, so it stops the deploy here
// rather than reaching a reader.
async function verify(path, html) {
  const headings = html.match(/<h1[\s>]/g) ?? [];
  if (headings.length > 1) throw new Error(`${path} printed ${headings.length} h1s`);

  for (const [asset] of html.matchAll(/\/assets\/[^"'\s)]+/g)) {
    await access(`dist${asset}`).catch(() => {
      throw new Error(`${path} refers to ${asset}, which the client build did not emit`);
    });
  }
}

for (const page of pages) {
  const html = renderPage(shell, page);
  await verify(page.path, html);

  const file = fileOf(page.path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

// Still the empty shell, so the magazine draws its own missing page under a real 404.
await writeFile('dist/404.html', shell);
await writeFile('dist/sitemap.xml', sitemap());
