import type { Page } from '../pages';
import type { Mode } from '../spread';
import type { Phase } from '../useFlip';
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
  return (
    <div
      className="magazine-book"
      data-phase={phase}
      data-spread={index}
      onPointerDown={onSwipe}
      ref={ref}
    >
      {/* One leaf at a time has no facing page at all, so the left half is not a blank
          half of a book — it does not exist. */}
      {mode === 'spread' && (left ? <Leaf page={left} /> : <Blank />)}

      {/* Two facing pages of one article are two windows onto the same copy of it, so the
          recto is an echo: it is read aloud once, from the verso, rather than twice. */}
      {right ? <Leaf page={right} silent={continues(left, right)} /> : <Blank />}
      {children}
    </div>
  );
}
