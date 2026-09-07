import { useIssue } from '../issue';
import { MAGAZINE_TITLE } from '../magazine';
import { findPageNumber, type Page } from '../pages';
import PageContent from './PageContent';

// Each leaf is its own sheet of paper — its own border, its own shadow, its own running
// head and folio. That is how a magazine is actually printed, and it is what lets a leaf
// carry its chrome with it when it turns.
export const LEAF =
  'a4-leaf @container flex touch-pan-y flex-col overflow-hidden border border-rule bg-paper font-sans text-muted shadow-lg print:border-0 print:shadow-none';

// The cover and back cover are their own masthead, and a blank leaf has nothing to run a
// head or folio over — the chrome is for the pages of the issue proper.
const CHROME_KINDS = new Set<Page['article']['kind']>(['contents', 'review']);

type LeafProps = {
  // Given only in the composing room, where this leaf is being laid out to be counted
  // rather than to be read.
  onParts?: (parts: number) => void;
  page: Page;
  // This page is a second window onto an article already open beside it, so its copy of
  // the text is kept out of the accessibility tree.
  silent?: boolean;
};

export default function Leaf({ onParts, page, silent }: LeafProps) {
  const pages = useIssue();
  const folio = findPageNumber(pages, page.path);
  const chrome = CHROME_KINDS.has(page.article.kind);

  return (
    <div className={LEAF} data-page={page.path}>
      {chrome && (
        <header className="border-b border-rule py-[1.5cqw] text-center text-[1.5cqw] tracking-[0.3em] text-muted uppercase">
          {MAGAZINE_TITLE}
        </header>
      )}

      {/* min-h-0 lets this shrink below its content, which is what hands the overflow of a
          long review to the next leaf instead of stretching the paper. Nothing scrolls: a
          page that ran long used to grow a scrollbar, and a printed page cannot.

          touch-action belongs here as well as on the leaf. Left to `auto`, the browser
          claims any touch that travels far enough as a scroll — in either direction — and
          sends `pointercancel`, so every swipe fell back home. */}
      <div className="leaf-page flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden">
        <PageContent onParts={onParts} page={page} silent={silent} />
      </div>

      {chrome && (
        <p className="mt-auto pb-[3%] text-center text-[1.5cqw] tabular-nums text-muted">{folio}</p>
      )}
    </div>
  );
}
