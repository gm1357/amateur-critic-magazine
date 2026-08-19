import { expect, test } from 'vitest';
import { flipAngle, TURN_DURATION, turnDuration } from '../../src/flip';

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
