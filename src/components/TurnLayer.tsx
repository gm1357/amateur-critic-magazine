import { curlPose, PERSPECTIVE, stripEdges, STRIPS, transformsOf } from '../curl';
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

// A strip of the leaf, drawn on its own: a whole leaf wide, with its origin on the spine, and
// turned about it through every strip before it until its face sits on the cut it hangs from.
// Where it lies is written by `useFlip`; `flat` is where it lies before anything has moved it.
//
// It has one face, and both sides of the page are printed on it: the front, and the back
// mirror-wise, so that seen from behind it reads the right way round. Whichever side faces the
// reader is the one shown, and `useFlip` changes them over as the strip passes edge-on. The
// obvious way — a second face turned over behind the first, and the browser left to hide
// whichever faces away — is one Chromium cannot draw: the foot of the turned-over face came
// out short once the paper stood up off the book.
//
// Each side is a slot onto a whole copy of the page, slid along so the part under it is the
// part this strip is cut from. The strip runs from `near` to `far` of the way out from the
// spine; from the leaf's left-hand edge that is `near` in when the spine is on the left and
// `1 - far` in when it is on the right. The back is the front turned over the spine, which
// mirrors it — and mirrored in place, the part of the back page behind this strip starts
// exactly as far in. The two washes shade the strip from either end.
//
// The strips at either end of the paper carry its side edges, which the copies of the page
// leave uncoloured: the one at the spine, and the one at the free edge.
function Strip({
  flat,
  side,
  strip,
  turn,
}: {
  flat: string;
  side: Side;
  strip: number;
  turn: Turn;
}) {
  const near = EDGES[strip];
  const far = EDGES[strip + 1];
  const at = { '--print-at': side === 'right' ? near : 1 - far } as React.CSSProperties;

  return (
    <div
      className="leaf-strip"
      data-edge={strip === 0 ? 'spine' : strip === STRIPS - 1 ? 'free' : undefined}
      data-strip={strip}
      style={{ '--strip-w': far - near, transform: flat } as React.CSSProperties}
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
    </div>
  );
}

// The leaf in the air. It exists only while a turn is running, which is what keeps the
// resting magazine free of transforms — and out of the way of the role queries that expect
// one heading per page.
//
// It is not a 3D scene the browser sorts by depth: its strips are drawn one after another,
// spine first, each in the leaf's own perspective. A curl never needs sorting — every point
// of the paper is higher off the book than the ones nearer the spine, so from above the book
// the strip drawn later is always the nearer one where two overlap — and that is what lets
// each strip reach a pixel past its cut under the next, so nothing shows through the cuts.
// Sorted, overlapping strips are planes that cross, and Chromium drew their feet as a
// staircase.
//
// The perspective is `PERSPECTIVE`, the distance the model works out which side of each strip
// the reader can see from.
export default function TurnLayer({ ref, turn }: { ref: React.Ref<HTMLDivElement>; turn: Turn }) {
  const side = sideOf(turn);

  // Where each strip lies before `useFlip` first moves it. React sets it once, when the strip
  // is made, and never again: from then on the pose is written straight to the node, and a
  // render that changes nothing here writes nothing.
  const flat = transformsOf(curlPose(0), turn.direction);

  return (
    <div
      aria-hidden="true"
      className="leaf-turn"
      data-side={side}
      ref={ref}
      style={{ '--perspective': PERSPECTIVE } as React.CSSProperties}
    >
      {flat.map((transform, strip) => (
        <Strip flat={transform} key={strip} side={side} strip={strip} turn={turn} />
      ))}
    </div>
  );
}

// Forward, the leaf lifts off the right half and swings left about the spine; back, it
// lifts off the left half and swings right.
function sideOf(turn: Turn): Side {
  return turn.direction === 'forward' ? 'right' : 'left';
}
