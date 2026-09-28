import { expect, test } from 'vitest';
import {
  dragProgress,
  FLICK,
  flickVelocity,
  remainingTravel,
  settleTarget,
  trail,
  VELOCITY_WINDOW,
  swipeIntent,
  swipeThreshold,
  TURN_DURATION,
  turnDuration,
  turnEasing,
} from '../../src/flip';

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

// Committing before the finger has said anything is what makes a page snatch itself out
// from under a reader who was only scrolling.
test('a swipe says nothing until it has gone somewhere', () => {
  expect(swipeIntent(0, 0, 10)).toBe('pending');
  expect(swipeIntent(6, 6, 10)).toBe('pending');
});

test('across the page turns it, down the page scrolls it', () => {
  expect(swipeIntent(-40, 4, 10)).toBe('forward');
  expect(swipeIntent(40, -4, 10)).toBe('backward');
  expect(swipeIntent(4, 40, 10)).toBe('scroll');
  expect(swipeIntent(-4, -40, 10)).toBe('scroll');
});

// A finger that is equally undecided is reading, not turning.
test('a diagonal is a scroll rather than a turn', () => {
  expect(swipeIntent(-30, 30, 10)).toBe('scroll');
});

test('the threshold means the same thing on a phone as on a desk', () => {
  expect(swipeThreshold(1000)).toBe(20);
  // Never so small that a resting thumb counts as a swipe.
  expect(swipeThreshold(100)).toBe(8);
});

// Half a leaf across a quarter of a second: a flick, and the sort a finger actually makes.
test('a flick is measured across a window, not across the last frame', () => {
  let samples = [{ progress: 0, time: 0 }];
  for (let frame = 1; frame <= 15; frame++) {
    samples = trail(samples, { progress: frame * 0.04, time: frame * 16 });
  }
  // A finger comes to rest against the paper before it lifts. The last pair of frames says
  // the gesture stopped; the window says it was moving when it mattered.
  samples = trail(samples, { progress: 0.601, time: 16 * 16 });

  expect(flickVelocity(samples)).toBeGreaterThan(FLICK);
  expect(settleTarget(0.601, flickVelocity(samples))).toBe('to');
});

test('a leaf placed slowly is judged on where it was put, not on the way it got there', () => {
  let samples = [{ progress: 0, time: 0 }];
  // A fifth of a leaf over a third of a second — a reader positioning the page, not
  // throwing it.
  for (let frame = 1; frame <= 20; frame++) {
    samples = trail(samples, { progress: frame * 0.01, time: frame * 16 });
  }

  expect(flickVelocity(samples)).toBeLessThan(FLICK);
  expect(settleTarget(0.2, flickVelocity(samples))).toBe('from');
});

test('one frame of jitter cannot pass for a flick', () => {
  const samples = trail(
    [
      { progress: 0.2, time: 0 },
      { progress: 0.2, time: 30 },
      { progress: 0.2, time: 60 },
    ],
    // A single sample that arrived far too fast to be a hand.
    { progress: 0.24, time: 62 },
  );

  // Across the last pair that is 20 leaf-widths a second; across the window it is what the
  // hand was really doing.
  expect(flickVelocity(samples)).toBeLessThan(FLICK);
});

test('the trail is bounded and keeps the newest samples', () => {
  let samples: { progress: number; time: number }[] = [];
  for (let frame = 0; frame < 40; frame++) {
    samples = trail(samples, { progress: frame / 40, time: frame * 16 });
  }

  expect(samples.length).toBeLessThanOrEqual(8);
  expect(samples.at(-1)).toEqual({ progress: 39 / 40, time: 39 * 16 });
});

test('a gesture with nothing to measure has no velocity', () => {
  expect(flickVelocity([])).toBe(0);
  expect(flickVelocity([{ progress: 0.4, time: 120 }])).toBe(0);
  // Two readings at the same instant are one reading.
  expect(
    flickVelocity([
      { progress: 0, time: 9 },
      { progress: 0.4, time: 9 },
    ]),
  ).toBe(0);
});

// A gesture reported at long intervals — a throttled or backgrounded frame — still has to
// produce a number rather than falling through the window and reading as stationary.
test('samples all older than the window are still measured', () => {
  const velocity = flickVelocity([
    { progress: 0, time: 0 },
    { progress: 0.5, time: VELOCITY_WINDOW * 3 },
  ]);

  expect(velocity).toBeCloseTo((0.5 * 1000) / (VELOCITY_WINDOW * 3), 5);
});

// A leaf turned from rest peels up slowly before it swings over; one that was let go of is
// already moving, and carries on at the speed the hand gave it rather than starting again.
test('a turn from rest eases in, and a leaf let go of carries on', () => {
  const lift = turnEasing(0);
  const carry = turnEasing(0.4);

  expect(lift).not.toBe(carry);
  expect(turnEasing(0.9)).toBe(carry);

  // Both are cubic-beziers; what tells them apart is how steeply each one starts.
  const slopeOf = (easing: string) => {
    const [x1, y1] = easing.match(/[\d.]+/g)!.map(Number);
    return y1 / x1;
  };
  expect(slopeOf(lift)).toBeLessThan(0.5);
  expect(slopeOf(carry)).toBeGreaterThan(1);
});
