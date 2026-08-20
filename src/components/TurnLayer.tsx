import type { Page } from '../pages';
import type { Turn } from '../spread';
import Leaf, { LEAF } from './Leaf';

// A face with no page on it is the blank side of a leaf — the verso of a cover, or of the
// single sheet a phone reads one at a time. It is real paper, and at the angle where it
// would be in the way it is always off the desk.
function Face({ face, page }: { face: 'front' | 'back'; page: Page | undefined }) {
  return (
    <div className="leaf-face" data-face={face}>
      {page ? <Leaf page={page} /> : <div className={LEAF} />}
    </div>
  );
}

// The leaf in the air. It exists only while a turn is running, which is what keeps the
// resting magazine free of 3D contexts — and out of the way of the role queries that
// expect one heading per page.
export default function TurnLayer({ ref, turn }: { ref: React.Ref<HTMLDivElement>; turn: Turn }) {
  return (
    <div aria-hidden="true" className="leaf-turn" data-side={sideOf(turn)} ref={ref}>
      <Face face="front" page={turn.front} />
      <Face face="back" page={turn.back} />
    </div>
  );
}

// Forward, the leaf lifts off the right half and swings left about the spine; back, it
// lifts off the left half and swings right.
function sideOf(turn: Turn): 'left' | 'right' {
  return turn.direction === 'forward' ? 'right' : 'left';
}
