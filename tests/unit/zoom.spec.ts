import { expect, test } from 'vitest';
import {
  anchoredScroll,
  clampScale,
  gapBetween,
  isDoubleTap,
  MAX_SCALE,
  midpoint,
  MIN_SCALE,
  pinchScale,
  stepScale,
  TAP_SCALE,
  tapScale,
  wheelScale,
  zoomedIn,
} from '../../src/zoom';

test('the page is never smaller than the desk nor larger than the range allows', () => {
  expect(clampScale(0.2)).toBe(MIN_SCALE);
  expect(clampScale(99)).toBe(MAX_SCALE);
  expect(clampScale(2.5)).toBe(2.5);
  expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
});

// It decides whether a drag turns the page or moves it, so it has to be exact rather than
// approximately right: stepping out repeatedly has to land *on* fit, not near it.
test('the whole page on the desk is not zoomed in', () => {
  expect(zoomedIn(MIN_SCALE)).toBe(false);
  expect(zoomedIn(1.0001)).toBe(true);

  let scale = MAX_SCALE;
  for (let press = 0; press < 40; press++) scale = stepScale(scale, 'out');

  expect(scale).toBe(MIN_SCALE);
  expect(zoomedIn(scale)).toBe(false);
});

test('the buttons walk the whole range and stop at its ends', () => {
  let scale = MIN_SCALE;
  for (let press = 0; press < 40; press++) scale = stepScale(scale, 'in');
  expect(scale).toBe(MAX_SCALE);

  // Every step in is a step out again — the ratio is the same in both directions.
  expect(stepScale(stepScale(2, 'in'), 'out')).toBeCloseTo(2, 10);
});

// A tap zooms in on the spot; the next one gives the page back, from wherever it had got to.
test('a double tap goes in to the reading size, and the next one comes back out', () => {
  expect(tapScale(MIN_SCALE)).toBe(TAP_SCALE);
  expect(tapScale(TAP_SCALE)).toBe(MIN_SCALE);
  expect(tapScale(MAX_SCALE)).toBe(MIN_SCALE);
  expect(tapScale(1.2)).toBe(MIN_SCALE);
});

test('a wheel magnifies one way and shrinks the other, and stays in range', () => {
  expect(wheelScale(2, -100)).toBeGreaterThan(2);
  expect(wheelScale(2, 100)).toBeLessThan(2);
  expect(wheelScale(MIN_SCALE, 5000)).toBe(MIN_SCALE);
  expect(wheelScale(MAX_SCALE, -5000)).toBe(MAX_SCALE);
});

// Measured from where the fingers started rather than frame to frame, so the page follows
// the hand exactly instead of accumulating rounding across a long pinch.
test('spreading the fingers twice as wide magnifies the page twice as much', () => {
  expect(pinchScale(1, 100, 200)).toBe(2);
  expect(pinchScale(2, 200, 100)).toBe(1);
  expect(pinchScale(1, 100, 9999)).toBe(MAX_SCALE);

  // Two fingers in the same place is not a division by zero.
  expect(pinchScale(2, 0, 50)).toBe(2);
});

test('two fingers have a gap and a middle', () => {
  expect(gapBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  expect(midpoint({ x: 0, y: 10 }, { x: 4, y: 20 })).toEqual({ x: 2, y: 15 });
});

// The point of the page under the reader's finger has to still be under it afterwards —
// that is the whole difference between magnifying the page and jumping somewhere else in it.
test('magnifying about a point leaves that point where it was', () => {
  const under = (scroll: number, anchor: number, scale: number) => (scroll + anchor) / scale;

  for (const [scroll, anchor, from, to] of [
    [0, 100, 1, 2],
    [240, 60, 2, 4],
    [500, 190, 3, 1.5],
  ]) {
    const moved = anchoredScroll(scroll, anchor, from, to);
    expect(under(moved, anchor, to)).toBeCloseTo(under(scroll, anchor, from), 6);
  }
});

test('the page is never scrolled off its own top-left corner', () => {
  // Zooming back out to fit has nowhere left to scroll to.
  expect(anchoredScroll(300, 100, 4, 1)).toBe(0);
  expect(anchoredScroll(0, 0, 0, 2)).toBe(0);
});

test('a double tap is two taps close together, in time and on the paper', () => {
  const first = { at: { x: 100, y: 100 }, time: 1000 };

  expect(isDoubleTap(first, { at: { x: 104, y: 103 }, time: 1200 })).toBe(true);
  expect(isDoubleTap(first, { at: { x: 104, y: 103 }, time: 1600 })).toBe(false);
  expect(isDoubleTap(first, { at: { x: 300, y: 100 }, time: 1200 })).toBe(false);
  expect(isDoubleTap(undefined, first)).toBe(false);
});
