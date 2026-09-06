import { MAGAZINE_TITLE } from '../magazine';
import { findPageNumber, type Page, pages } from '../pages';
import PageContent from './PageContent';

// Each leaf is its own sheet of paper — its own border, its own shadow, its own running
// head and folio. That is how a magazine is actually printed, and it is what lets a leaf
// carry its chrome with it when it turns.
export const LEAF =
  'a4-leaf @container flex touch-pan-y flex-col overflow-hidden border border-rule bg-paper font-sans text-muted shadow-lg print:border-0 print:shadow-none';

// The cover and back cover are their own masthead, and a blank leaf has nothing to run a
// head or folio over — the chrome is for the pages of the issue proper.
const CHROME_KINDS = new Set<Page['kind']>(['contents', 'review']);

export default function Leaf({ page }: { page: Page }) {
  const folio = findPageNumber(pages, page.path);
  const chrome = CHROME_KINDS.has(page.kind);

  return (
    <div className={LEAF} data-page={page.path}>
      {chrome && (
        <header className="border-b border-rule py-3 text-center text-xs tracking-[0.3em] text-muted uppercase">
          {MAGAZINE_TITLE}
        </header>
      )}

      {/* min-h-0 lets this shrink below its content, which is what moves the overflow of a
          long review inside the page instead of stretching the paper.

          touch-action belongs here as well as on the leaf, and this is the copy that does
          the work: a touch resolves its touch-action from what it landed on up to that
          element's scroll container, and this is the scroll container. Left to `auto`, the
          browser claims any touch that travels far enough as a scroll — in either
          direction — and sends `pointercancel`, so every swipe fell back home. */}
      <div className="leaf-scroll flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto">
        <PageContent page={page} />
      </div>

      {chrome && (
        <p className="mt-auto pb-[3%] text-center text-xs tabular-nums text-muted">{folio}</p>
      )}
    </div>
  );
}
