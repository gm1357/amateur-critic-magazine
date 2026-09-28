import { PERSPECTIVE } from '../curl';
import { useIssue } from '../issue';
import { isPastContents, type Page } from '../pages';
import type { Mode } from '../spread';
import type { Phase } from '../useFlip';
import Bookmark from './Bookmark';
import Leaf from './Leaf';

function Blank() {
  return <div aria-hidden="true" className="leaf-blank" />;
}

// Whether the right-hand page is more of the article on the left-hand one.
function continues(left: Page | undefined, right: Page | undefined): boolean {
  return left !== undefined && right !== undefined && left.article.path === right.article.path;
}

// The two halves that stay put. During a turn these are not the spread being left or the
// one being joined but one half of each — the halves the turning leaf is not covering.
export default function Spread({
  children,
  index,
  left,
  mode,
  onSwipe,
  phase,
  ref,
  right,
}: {
  children?: React.ReactNode;
  index: number;
  left: Page | undefined;
  mode: Mode;
  onSwipe: (event: React.PointerEvent<HTMLElement>) => void;
  phase: Phase;
  ref: React.Ref<HTMLDivElement>;
  right: Page | undefined;
}) {
  const pages = useIssue();

  // The leaf the ribbon hangs from is the left-hand one — and reading a leaf at a time
  // there is no facing page, so the one leaf on show is the left-hand one. These are the
  // halves standing on the desk, so during a turn the bookmark belongs to the paper that
  // is actually under it rather than to the URL.
  const marked = mode === 'spread' ? left : right;

  return (
    // The perspective a leaf in the air is seen in comes from the curl model, which works out
    // from the same distance which side of each strip of it the reader can see.
    <div
      className="magazine-book"
      data-phase={phase}
      data-spread={index}
      onPointerDown={onSwipe}
      ref={ref}
      style={{ '--perspective': PERSPECTIVE } as React.CSSProperties}
    >
      {/* One leaf at a time has no facing page at all, so the left half is not a blank
          half of a book — it does not exist. */}
      {mode === 'spread' && (left ? <Leaf page={left} /> : <Blank />)}

      {/* Two facing pages of one article are two windows onto the same copy of it, so the
          recto is an echo: it is read aloud once, from the verso, rather than twice. */}
      {right ? <Leaf page={right} silent={continues(left, right)} /> : <Blank />}

      {/* Nothing to mark a way back to until the reader is past the listing itself. */}
      {isPastContents(pages, marked) && <Bookmark />}

      {children}
    </div>
  );
}
