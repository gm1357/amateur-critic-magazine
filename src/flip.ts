import type { Direction } from './spread';

// Long enough to read as paper rather than as a slide, short enough that paging through
// the issue does not feel like waiting.
export const TURN_DURATION = 620;

const SHORTEST = 140;

// Module scope, so the query is made once and its identity never changes between a
// compiled and an uncompiled build.
const reduced =
  typeof window === 'undefined' ? undefined : window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion(): boolean {
  return reduced?.matches ?? false;
}

// A forward turn lifts the right-hand leaf and lays it down on the left, which is a
// negative rotation about the spine; turning back is the same motion reversed.
export function flipAngle(direction: Direction, progress: number): number {
  return (direction === 'forward' ? -180 : 180) * progress;
}

// Reduced motion means the leaf lands immediately — a zero duration, not a suppressed
// animation, so the turn still resolves and the magazine still knows it has arrived.
// A leaf released most of the way over has less to travel, so it takes less time.
export function turnDuration(reducedMotion: boolean, remaining: number): number {
  if (reducedMotion) return 0;
  return Math.round(Math.min(Math.max(TURN_DURATION * remaining, SHORTEST), TURN_DURATION));
}

// A flick: how fast the leaf has to be travelling, in leaf-widths per second, for the
// release to complete a turn the drag never got halfway through. Half a page a second is
// brisk for a gesture whose whole job is positioning, and a reader placing a leaf to look
// at it is slower still.
export const FLICK = 1.4;

export type Sample = { progress: number; time: number };

// A finger slows as it lifts, so the last pair of frames is the worst available measure of
// a flick: a page thrown across in a fifth of a second reads as stationary at the moment
// it is let go. Velocity is taken over a window instead — long enough to survive that
// deceleration and a dropped frame, short enough that a drag which paused and then moved
// is judged on the moving.
export const VELOCITY_WINDOW = 90;

const TRAIL = 8;

export function trail(samples: Sample[], sample: Sample): Sample[] {
  return [...samples, sample].slice(-TRAIL);
}

export function flickVelocity(samples: Sample[]): number {
  const last = samples.at(-1);
  if (!last) return 0;

  // The samples are in order, so the oldest one still inside the window is the earliest
  // reading worth drawing a line through. A gesture reported at long intervals may have
  // only the latest inside it, and is then measured against the reading before, however
  // old — a number from a stale sample beats no number at all.
  const recent = samples.filter((sample) => last.time - sample.time <= VELOCITY_WINDOW);
  const first = recent.length > 1 ? recent[0] : (samples.at(-2) ?? last);
  const elapsed = last.time - first.time;
  if (elapsed <= 0) return 0;

  return ((last.progress - first.progress) * 1000) / elapsed;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

// How far over the leaf is, from the drag so far. Dragging left turns forward and
// dragging right turns back, so the two directions read the pointer with opposite signs.
export function dragProgress(direction: Direction, dx: number, leafWidth: number): number {
  if (leafWidth <= 0) return 0;
  return clamp((direction === 'forward' ? -dx : dx) / leafWidth, 0, 1);
}

// Let go past halfway and the leaf falls over; let go before that and it falls back. A
// flick beats the halfway rule in either direction, which is what makes a quick swipe work
// without having to drag the page all the way across.
export function settleTarget(progress: number, velocity: number): 'to' | 'from' {
  if (velocity > FLICK) return 'to';
  if (velocity < -FLICK) return 'from';
  return progress > 0.5 ? 'to' : 'from';
}

export function remainingTravel(progress: number, settle: 'to' | 'from'): number {
  return settle === 'to' ? 1 - progress : progress;
}

// How far a finger has to travel before the magazine decides whether it is turning a page
// or scrolling one. A fraction of a leaf rather than a pixel count, so it means the same
// thing on a phone as on a desk.
export function swipeThreshold(leafWidth: number): number {
  return Math.max(leafWidth * 0.02, 8);
}

// A swipe does not say which way it is going until it has gone somewhere. Until then it is
// neither a turn nor a scroll, and committing early is what makes a page snatch itself out
// from under a reader who was only scrolling.
export function swipeIntent(
  dx: number,
  dy: number,
  threshold: number,
): Direction | 'scroll' | 'pending' {
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return 'pending';
  if (Math.abs(dy) >= Math.abs(dx)) return 'scroll';
  return dx < 0 ? 'forward' : 'backward';
}
