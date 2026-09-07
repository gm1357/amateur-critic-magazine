// A page is a fixed layout, so zoom is not a change of type size — it is a magnifying glass
// held over the paper. All of it is arithmetic on a scale and a scroll offset, which is why
// it lives here rather than in the hook: the same reason `src/flip.ts` exists.

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

// Where a double tap lands. Roughly newspaper type on a phone, and far enough from the
// maximum that there is still somewhere to pinch to.
export const TAP_SCALE = 2;

// One press of a button. A ratio rather than an increment, so the steps feel even the whole
// way up instead of crawling at the top.
const STEP = 1.25;

// How much of a wheel a full doubling is worth. Trackpad pinches arrive as small deltas and
// a mouse wheel as large ones, and the exponential below treats both proportionally.
const WHEEL = 0.0025;

// How close together two taps have to be, in time and on the paper, to be one gesture. The
// distance is what tells a double tap from two deliberate taps on neighbouring entries.
const TAP_GAP = 320;
const TAP_SLOP = 24;

export type Point = { x: number; y: number };
export type Tap = { at: Point; time: number };

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

// Whether the reader is looking at anything other than the whole page. It is what decides
// that a drag pans rather than turns, so it has to be exact: stepping out repeatedly lands
// on MIN_SCALE through the clamp, not near it.
export function zoomedIn(scale: number): boolean {
  return scale > MIN_SCALE;
}

export function stepScale(scale: number, direction: 'in' | 'out'): number {
  return clampScale(direction === 'in' ? scale * STEP : scale / STEP);
}

// A double tap zooms in on the spot; a second one gives the page back. Anything short of
// the whole page counts as zoomed, so the tap that follows a pinch always returns to fit.
export function tapScale(scale: number): number {
  return zoomedIn(scale) ? MIN_SCALE : TAP_SCALE;
}

export function wheelScale(scale: number, deltaY: number): number {
  return clampScale(scale * Math.exp(-deltaY * WHEEL));
}

// Pinching is measured from where the fingers started rather than frame to frame, so the
// scale follows the hand exactly and rounding never accumulates across a long gesture.
export function pinchScale(startScale: number, startGap: number, gap: number): number {
  if (startGap <= 0) return clampScale(startScale);
  return clampScale((startScale * gap) / startGap);
}

export function gapBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// The scroll offset that keeps the paper under the reader's fingers where it is while the
// scale changes beneath them. `anchor` is measured from the near edge of the window they are
// reading through, so the point of the page at `(scroll + anchor) / from` has to still be at
// `anchor` once the page is `to` times its size.
//
// Negative offsets are clamped here; the far end is left to the browser, which is the only
// thing that knows how much scrollable paper there is.
export function anchoredScroll(scroll: number, anchor: number, from: number, to: number): number {
  if (from <= 0) return 0;
  return Math.max(0, ((scroll + anchor) * to) / from - anchor);
}

// Derived from the pointer stream rather than taken from a `dblclick`, because a finger's
// double tap is synthesised differently by every engine and some do not synthesise it at
// all. One path, and a mouse and a finger travel it alike.
export function isDoubleTap(previous: Tap | undefined, tap: Tap): boolean {
  if (!previous) return false;

  return tap.time - previous.time <= TAP_GAP && gapBetween(previous.at, tap.at) <= TAP_SLOP;
}
