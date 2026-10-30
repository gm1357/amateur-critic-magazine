import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import Leaf, { DESK } from './components/Leaf';
import PageHead from './components/PageHead';
import { reviews } from './data/reviews';
import { DEFAULT_DESK } from './desk';
import { articles, type Page, pages } from './pages';
import { headOf, sitemapOf } from './seo';

export { pages };

// What the build writes out after the client bundle exists. This is its own entry because it
// has to go through Vite: the issue is globbed at compile time, and the frames' hashed URLs
// only exist there.
export function sitemap(): string {
  return sitemapOf(articles, reviews);
}

// One leaf on the desk, the shape the magazine draws a missing page in. Every length on it is
// a share of the leaf, so it needs no measuring to look right — though typesetting does, which
// is why the client replaces this outright rather than hydrating it. It would not match.
function staticPage(page: Page) {
  return (
    <StaticRouter location={page.path}>
      <div className={DESK} data-desk={DEFAULT_DESK} data-mode="single" data-zoom="fit">
        <div className="magazine-book">
          <Leaf page={page} />
        </div>
      </div>
    </StaticRouter>
  );
}

// Throws rather than falling through: a shell this cannot print into is a build that would
// otherwise ship every page of the issue with nothing on it.
function printInto(shell: string, slot: RegExp, content: string): string {
  if (!slot.test(shell)) throw new Error(`The HTML shell has no ${slot}`);
  return shell.replace(slot, () => content);
}

// React escapes every value it prints, so a `<` here can only be the start of a tag.
function markPrinted(head: string): string {
  return head.replace(/<(title|meta|link)\b/g, '<$1 data-printed');
}

export function renderPage(shell: string, page: Page): string {
  const head = markPrinted(renderToStaticMarkup(<PageHead head={headOf(page.article)} />));
  const body = renderToStaticMarkup(staticPage(page));

  return printInto(
    printInto(shell, /<title[^>]*>.*<\/title>/, head),
    /<div id="root"><\/div>/,
    `<div id="root">${body}</div>`,
  );
}
