import type { Direction, Mode } from './spread';

// How a leaf in the air bends. Paper lifted by its edge is not a board swinging on a hinge:
// the edge comes up first, the part by the spine follows, and the sheet between them curls.
// Everything here is in degrees of the turn — 0 lying on the page it started from, 180
// lying on the page it is going to — whichever way the leaf happens to be turning.

// How many strips the leaf is cut into to be bent. Each one is a whole copy of the page
// seen through a slot, so this is paid for in layout at the start of every turn.
export const STRIPS = 8;

// How far the free edge runs ahead of the spine at the deepest point of the curl, halfway
// over. Anything under about 114 degrees keeps every point of the paper moving the same way
// for the whole turn and keeps the edge from passing through the page it lands on; the
// suite in tests/unit/curl.spec.ts holds both.
export const LEAD = 60;

// How dark paper turned edge-on to the reader gets, as the opacity of a black wash.
export const SHADE = 0.5;

// How far above the book the reader's eye is while a leaf is in the air, in leaf widths. The
// desk's perspective is set from this, and it is also what decides which side of a strip the
// reader can see — so the two cannot be allowed to disagree.
export const PERSPECTIVE = 2.6;

// The bend gathers towards the free edge as the square of the distance from the spine.
// Cutting the strips at √(i/n) across the leaf gives each of them the same share of it, so
// every strip turns exactly as far past the one it hangs from as the next does — and the
// strip at the spine, where the paper hardly bends, is the widest one.
export function stripEdges(): number[] {
  return Array.from({ length: STRIPS + 1 }, (_, edge) => Math.sqrt(edge / STRIPS));
}

export type Pose = {
  // The angle each strip lies at, spine first.
  strips: number[];
  // The angle the paper itself is at along each edge between strips, the spine and the free
  // edge included — which is what the light is worked out from, so the shading runs
  // smoothly across the cuts rather than stepping at every one.
  joins: number[];
};

// The spine and the free edge straddle a plain rotation of 180 × progress, one behind it
// and one ahead, and the gap between them opens and closes with the turn.
export function curlPose(progress: number): Pose {
  const lead = LEAD * Math.sin(Math.PI * progress);
  const spine = 180 * progress - lead / 2;

  return {
    strips: Array.from({ length: STRIPS }, (_, strip) => spine + (lead * (strip + 0.5)) / STRIPS),
    joins: Array.from({ length: STRIPS + 1 }, (_, join) => spine + (lead * join) / STRIPS),
  };
}

// How far each strip turns past the one before it, spine first.
export function bends({ strips }: Pose): number[] {
  return strips.map((angle, strip) => (strip === 0 ? angle : angle - strips[strip - 1]));
}

// One step of walking out from the spine along the paper: turn by an angle, or go along the
// way it now faces by a share of the leaf.
export type Step = { turn: number } | { along: number };

// Each strip is drawn on its own, walked out from the spine through every strip before it —
// turn, go along that strip, turn again — to the cut it hangs from, where it takes its own
// angle. Two neighbours walk the same steps as far as the one nearer the spine goes, so they
// cannot disagree about where they meet, and every strip is the same run of steps at every
// pose, so a settle between two poses interpolates with the paper shut all the way.
export function chainOf(pose: Pose): Step[][] {
  const edges = stripEdges();
  const turns = bends(pose);

  return turns.map((_, strip) =>
    turns
      .slice(0, strip + 1)
      .flatMap((turn, before): Step[] =>
        before < strip ? [{ turn }, { along: edges[before + 1] - edges[before] }] : [{ turn }],
      ),
  );
}

// A strip's walk as a transform, on an element a whole leaf wide whose origin is the spine,
// so going along the paper is a percentage of the element's own width.
function transformOf(steps: Step[], direction: Direction): string {
  const outward = direction === 'forward' ? 1 : -1;

  return steps
    .map((step) =>
      'turn' in step
        ? `rotateY(${rotation(direction, step.turn)}deg)`
        : `translateX(${outward * step.along * 100}%)`,
    )
    .join(' ');
}

// How many steps a settle is drawn in. The browser interpolates between them, and a
// rotation interpolates exactly, so this only has to be fine enough for the curl's own shape.
const FRAMES = 24;

export function curlFrames(from: number, to: number): Pose[] {
  return Array.from({ length: FRAMES + 1 }, (_, frame) =>
    curlPose(from + ((to - from) * frame) / FRAMES),
  );
}

// Lit from where the reader is looking: paper facing them is unshaded, and it darkens as it
// turns away. The back of the leaf catches the light the same way the front does.
export function shade(angle: number): number {
  return SHADE * (1 - Math.abs(Math.cos((angle * Math.PI) / 180)));
}

// A forward turn lifts the right-hand leaf and lays it down on the left, which is a
// negative rotation about the spine; turning back is the same motion reversed.
export function rotation(direction: Direction, angle: number): number {
  return direction === 'forward' ? -angle : angle;
}

// Where the reader looks from, relative to the spine, in leaf widths: how far along the paper
// towards its free edge, and how far up off the book. The perspective is centred on the book,
// which on a wide desk is the spine itself. Reading one leaf at a time it is the middle of that
// leaf — towards the free edge of a leaf lifting off it to the right, and away from the free
// edge of one coming back in from off the desk on the left.
export type Eye = { along: number; above: number };

export function eyeOf(mode: Mode, direction: Direction): Eye {
  if (mode === 'spread') return { along: 0, above: PERSPECTIVE };
  return { along: direction === 'forward' ? 0.5 : -0.5, above: PERSPECTIVE };
}

// Which strips show the reader the front of the leaf. A strip does not turn its back at 90
// degrees: under perspective a strip standing to one side of the reader is still seen from
// its front after it passes upright. It shows its front for exactly as long as the reader's
// eye is on the front side of its plane. Each strip hangs from the free edge of the one
// before, so where its hinge is comes from walking out along the paper from the spine.
export function facing({ strips }: Pose, eye: Eye): boolean[] {
  const edges = stripEdges();
  let along = 0;
  let above = 0;

  return strips.map((angle, strip) => {
    const radians = (angle * Math.PI) / 180;
    // The front's normal: straight up off the book when the strip lies flat, and turning with it.
    const front =
      (eye.along - along) * -Math.sin(radians) + (eye.above - above) * Math.cos(radians);

    const width = edges[strip + 1] - edges[strip];
    along += width * Math.cos(radians);
    above += width * Math.sin(radians);

    return front > 0;
  });
}

// How finely a settle is searched for the moments its strips turn over, before each one is
// pinned down exactly. Each strip turns over once in a whole turn, so this only has to be
// fine enough not to step over one.
const SEARCH = 240;

// When, as a share of a settle from one progress to another, each strip turns its back on the
// reader — or its front, if the leaf is falling back — or undefined if it does not in this
// settle. The page on each strip is changed over at exactly that moment, when the strip is
// edge-on and the change cannot be seen.
export function turnovers(from: number, to: number, eye: Eye): (number | undefined)[] {
  const at = (share: number) => facing(curlPose(from + (to - from) * share), eye);
  const found: (number | undefined)[] = Array(STRIPS).fill(undefined);

  let before = at(0);
  for (let step = 1; step <= SEARCH; step++) {
    const after = at(step / SEARCH);

    for (let strip = 0; strip < STRIPS; strip++) {
      if (found[strip] !== undefined || after[strip] === before[strip]) continue;

      let low = (step - 1) / SEARCH;
      let high = step / SEARCH;
      for (let halving = 0; halving < 40; halving++) {
        const middle = (low + high) / 2;
        if (at(middle)[strip] === before[strip]) low = middle;
        else high = middle;
      }
      found[strip] = (low + high) / 2;
    }

    before = after;
  }

  return found;
}

export type StripLook = {
  transform: string;
  // Whether the reader sees the front of the leaf on this strip or the back.
  front: boolean;
  // The wash by the strip's hinge and by its free edge. Each is taken from the join it
  // sits on, so two neighbouring strips agree exactly where they meet.
  hinge: number;
  free: number;
};

// What each strip is drawn with at a pose, spine first — the one thing the component needs,
// whether a drag is writing it straight to the paper or a settle is animating through it.
// Where each strip lies at a pose, as the transform that walks it out from the spine.
export function transformsOf(pose: Pose, direction: Direction): string[] {
  return chainOf(pose).map((steps) => transformOf(steps, direction));
}

export function stripsOf(pose: Pose, direction: Direction, eye: Eye): StripLook[] {
  const front = facing(pose, eye);
  const transforms = transformsOf(pose, direction);

  return transforms.map((transform, strip) => ({
    transform,
    front: front[strip],
    hinge: shade(pose.joins[strip]),
    free: shade(pose.joins[strip + 1]),
  }));
}
