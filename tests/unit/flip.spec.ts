import { expect, test } from 'vitest';
import {
  dragProgress,
  FLICK,
  flipAngle,
  remainingTravel,
  settleTarget,
  TURN_DURATION,
  turnDuration,
} from '../../src/flip';

test('a turn is half a rotation, and the two directions are mirrors', () => {
  // A leaf at rest is at no angle at all, whichever way it is about to go.
  expect(flipAngle('forward', 0)).toBeCloseTo(0);
  expect(flipAngle('backward', 0)).toBeCloseTo(0);

  expect(flipAngle('forward', 1)).toBe(-180);
  expect(flipAngle('backward', 1)).toBe(180);

  for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    expect(flipAngle('forward', progress)).toBe(-flipAngle('backward', progress));
  }
});

test('the leaf sweeps the same way throughout the turn', () => {
  let previous = flipAngle('forward', 0);

  for (let step = 1; step <= 10; step++) {
    const angle = flipAngle('forward', step / 10);
    expect(angle).toBeLessThan(previous);
    previous = angle;
  }
});

test('a leaf most of the way over has less far to fall', () => {
  expect(turnDuration(false, 1)).toBe(TURN_DURATION);
  expect(turnDuration(false, 0.5)).toBeLessThan(TURN_DURATION);
  expect(turnDuration(false, 0.5)).toBeGreaterThan(turnDuration(false, 0.1));
});

// Short enough to read as instant, but never so short that it is over before it starts.
test('a turn is never longer than a full one nor quicker than the eye', () => {
  expect(turnDuration(false, 0)).toBeGreaterThan(0);
  expect(turnDuration(false, 2)).toBe(TURN_DURATION);
});

// Not a suppressed animation but a zero-length one: it still resolves, so the magazine
// still learns that the leaf has landed.
test('a reader who asked for less motion gets the turn instantly, not never', () => {
  expect(turnDuration(true, 1)).toBe(0);
  expect(turnDuration(true, 0.2)).toBe(0);
});

test('dragging left turns forward and dragging right turns back', () => {
  expect(dragProgress('forward', -100, 400)).toBeCloseTo(0.25);
  expect(dragProgress('backward', 100, 400)).toBeCloseTo(0.25);

  // Dragging the wrong way does not turn the leaf backwards through the spine.
  expect(dragProgress('forward', 100, 400)).toBe(0);
  expect(dragProgress('backward', -100, 400)).toBe(0);
});

test('a drag past the far edge is still one turn', () => {
  expect(dragProgress('forward', -800, 400)).toBe(1);
  expect(dragProgress('backward', 800, 400)).toBe(1);
});

// Measured before the first leaf has been laid out, there is no leaf width to divide by.
test('a drag with nothing to measure against does not turn anything', () => {
  expect(dragProgress('forward', -100, 0)).toBe(0);
});

test('a leaf let go past halfway falls over, and before it falls back', () => {
  expect(settleTarget(0.51, 0)).toBe('to');
  expect(settleTarget(0.49, 0)).toBe('from');
  expect(settleTarget(0.5, 0)).toBe('from');
});

// Otherwise a quick swipe would have to drag the page all the way across to count.
test('a flick beats the halfway rule, in either direction', () => {
  expect(settleTarget(0.1, FLICK + 0.1)).toBe('to');
  expect(settleTarget(0.9, -FLICK - 0.1)).toBe('from');

  // But a slow drag is judged on where it got to, not on which way it drifted.
  expect(settleTarget(0.1, FLICK - 0.1)).toBe('from');
  expect(settleTarget(0.9, -FLICK + 0.1)).toBe('to');
});

test('what is left to travel depends on which way the leaf is falling', () => {
  expect(remainingTravel(0.3, 'to')).toBeCloseTo(0.7);
  expect(remainingTravel(0.3, 'from')).toBeCloseTo(0.3);
});
