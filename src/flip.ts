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
