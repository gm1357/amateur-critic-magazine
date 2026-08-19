import { MAGAZINE_TITLE } from '../magazine';
import { findPageNumber, type Page, pages } from '../pages';
import PageContent from './PageContent';

// Each leaf is its own sheet of paper — its own border, its own shadow, its own running
// head and folio. That is how a magazine is actually printed, and it is what lets a leaf
// carry its chrome with it when it turns.
export const LEAF =
  'a4-leaf @container flex touch-pan-y flex-col overflow-hidden border border-rule bg-paper font-sans text-muted shadow-lg print:border-0 print:shadow-none';

export default function Leaf({ page }: { page: Page }) {
  const folio = findPageNumber(pages, page.path);

  return (
    <div className={LEAF} data-page={page.path}>
      {/* The cover is its own masthead, so the chrome starts on page two. */}
      {folio > 1 && (
        <header className="border-b border-rule py-3 text-center text-xs tracking-[0.3em] text-muted uppercase">
          {MAGAZINE_TITLE}
        </header>
      )}

      {/* min-h-0 lets this shrink below its content, which is what moves the overflow of a
          long review inside the page instead of stretching the paper. */}
      <div className="leaf-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        <PageContent page={page} />
      </div>

      {folio > 1 && (
        <p className="mt-auto pb-[3%] text-center text-xs tabular-nums text-muted">{folio}</p>
      )}
    </div>
  );
}
