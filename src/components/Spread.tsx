import type { Page } from '../pages';
import type { Mode } from '../spread';
import type { Phase } from '../useFlip';
import Leaf from './Leaf';

function Blank() {
  return <div aria-hidden="true" className="leaf-blank" />;
}

// The two halves that stay put. During a turn these are not the spread being left or the
// one being joined but one half of each — the halves the turning leaf is not covering.
export default function Spread({
  children,
  index,
  left,
  mode,
  phase,
  right,
}: {
  children?: React.ReactNode;
  index: number;
  left: Page | undefined;
  mode: Mode;
  phase: Phase;
  right: Page | undefined;
}) {
  return (
    <div className="magazine-book" data-phase={phase} data-spread={index}>
      {/* One leaf at a time has no facing page at all, so the left half is not a blank
          half of a book — it does not exist. */}
      {mode === 'spread' && (left ? <Leaf page={left} /> : <Blank />)}
      {right ? <Leaf page={right} /> : <Blank />}
      {children}
    </div>
  );
}
