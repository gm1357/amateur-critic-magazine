import { stripEdges, STRIPS } from '../curl';
import type { Page } from '../pages';
import type { Turn } from '../spread';
import Leaf, { LEAF } from './Leaf';

const EDGES = stripEdges();

type Side = 'left' | 'right';

// A face with no page on it is the blank side of a leaf — the verso of a cover, or of the
// single sheet a phone reads one at a time. It is real paper, and at the angle where it
// would be in the way it is always off the desk.
function Print({ page }: { page: Page | undefined }) {
  return page ? <Leaf page={page} /> : <div className={LEAF} />;
}

// A strip of the leaf, hung from the free edge of the one before it — which is what keeps
// the paper whole however it bends: a strip cannot come away from the edge it hangs from.
//
// It has one face, and both sides of the page are printed on it: the front, and the back
// mirror-wise, so that seen from behind it reads the right way round. Whichever side faces the
// reader is the one shown, and `useFlip` changes them over as the strip passes edge-on. The
// obvious way — a second face turned over behind the first, and the browser left to hide
// whichever faces away — is the one Chromium cannot draw: once the paper stood up off the book
// the foot of the strip came out short, worst at the free edge.
//
// Each side is a slot onto a whole copy of the page, slid along so the part under it is the
// part this strip is cut from. The strip runs from `near` to `far` of the way out from the
// spine; from the leaf's left-hand edge that is `near` in when the spine is on the left and
// `1 - far` in when it is on the right. The back is the front turned over the spine, which
// mirrors it — and mirrored in place, the part of the back page behind this strip starts
// exactly as far in. The two washes shade the strip from either end.
function Strip({ side, strip, turn }: { side: Side; strip: number; turn: Turn }) {
  const near = EDGES[strip];
  const far = EDGES[strip + 1];
  const at = { '--print-at': side === 'right' ? near : 1 - far } as React.CSSProperties;

  return (
    <div
      className="leaf-strip"
      data-strip={strip}
      style={{ '--strip-w': far - near } as React.CSSProperties}
    >
      <div className="leaf-face">
        <div className="leaf-print" data-face="front" style={at}>
          <Print page={turn.front} />
        </div>
        <div className="leaf-print" data-face="back" style={at}>
          <Print page={turn.back} />
        </div>
        <div className="leaf-shade" data-shade="hinge" />
        <div className="leaf-shade" data-shade="free" />
      </div>
      {strip + 1 < STRIPS && <Strip side={side} strip={strip + 1} turn={turn} />}
    </div>
  );
}

// The leaf in the air. It exists only while a turn is running, which is what keeps the
// resting magazine free of 3D contexts — and out of the way of the role queries that
// expect one heading per page.
export default function TurnLayer({ ref, turn }: { ref: React.Ref<HTMLDivElement>; turn: Turn }) {
  const side = sideOf(turn);

  return (
    <div aria-hidden="true" className="leaf-turn" data-side={side} ref={ref}>
      <Strip side={side} strip={0} turn={turn} />
    </div>
  );
}

// Forward, the leaf lifts off the right half and swings left about the spine; back, it
// lifts off the left half and swings right.
function sideOf(turn: Turn): Side {
  return turn.direction === 'forward' ? 'right' : 'left';
}
