import { expect, test } from 'vitest';
import {
  bends,
  curlFrames,
  curlPose,
  eyeOf,
  facing,
  LEAD,
  PERSPECTIVE,
  rotation,
  shade,
  SHADE,
  stripEdges,
  STRIPS,
  stripsOf,
  turnovers,
} from '../../src/curl';

// Every tenth of a percent of a turn, ends included.
const GRID = Array.from({ length: 1001 }, (_, step) => step / 1000);
const INSIDE = GRID.slice(1, -1);

function leadOf(progress: number): number {
  const { joins } = curlPose(progress);
  return joins[STRIPS] - joins[0];
}

test('the strips cover the leaf exactly, widest at the spine', () => {
  const edges = stripEdges();

  expect(edges).toHaveLength(STRIPS + 1);
  expect(edges[0]).toBe(0);
  expect(edges[STRIPS]).toBe(1);

  const widths = edges.slice(1).map((edge, strip) => edge - edges[strip]);
  for (const [strip, width] of widths.entries()) {
    expect(width).toBeGreaterThan(0);
    if (strip > 0) expect(width).toBeLessThan(widths[strip - 1]);
  }
});

// The property `planTurn` is built on: at the start of a turn the leaf is exactly the
// spread being left, and at the end exactly the one being joined. A curl that did not
// flatten out at both ends would snap on the first and the last frame.
test('a leaf at either end of its turn lies flat', () => {
  const start = curlPose(0);
  for (const angle of [...start.strips, ...start.joins]) expect(angle).toBeCloseTo(0, 9);

  const end = curlPose(1);
  for (const angle of [...end.strips, ...end.joins]) expect(angle).toBeCloseTo(180, 9);
});

test('in the air the free edge leads and the spine follows', () => {
  for (const progress of INSIDE) {
    const { joins, strips } = curlPose(progress);

    for (let join = 1; join <= STRIPS; join++) expect(joins[join]).toBeGreaterThan(joins[join - 1]);
    for (let strip = 1; strip < STRIPS; strip++) {
      expect(strips[strip]).toBeGreaterThan(strips[strip - 1]);
    }
  }
});

// A drag that goes one way must turn every part of the paper that way — the browser suite
// watches the whole angle track of a released leaf for exactly this.
test('no part of the paper ever goes backwards during a turn', () => {
  let previous = curlPose(0);

  for (const progress of GRID.slice(1)) {
    const pose = curlPose(progress);
    for (let strip = 0; strip < STRIPS; strip++) {
      expect(pose.strips[strip]).toBeGreaterThan(previous.strips[strip]);
    }
    for (let join = 0; join <= STRIPS; join++) {
      expect(pose.joins[join]).toBeGreaterThan(previous.joins[join]);
    }
    previous = pose;
  }
});

// Below 0 the paper would pass through the pages under it; past 180 through the page it is
// coming down on.
test('the paper never passes through the book or through the facing page', () => {
  for (const progress of GRID) {
    const { joins, strips } = curlPose(progress);
    for (const angle of [...joins, ...strips]) {
      expect(angle).toBeGreaterThanOrEqual(-1e-9);
      expect(angle).toBeLessThanOrEqual(180 + 1e-9);
    }
  }
});

test('the curl is deepest halfway over, and gone at either end', () => {
  expect(leadOf(0)).toBeCloseTo(0, 9);
  expect(leadOf(1)).toBeCloseTo(0, 9);
  expect(leadOf(0.5)).toBeCloseTo(LEAD, 9);

  for (const progress of INSIDE) expect(leadOf(progress)).toBeLessThanOrEqual(LEAD + 1e-9);
});

// The strips hang from one another, so each is drawn by how far it turns past the one it
// hangs from. They are cut so that share is the same all the way along, which is what
// makes the widest strip the one at the spine, where the paper hardly bends.
test('each strip turns the same share further than the one it hangs from', () => {
  for (const progress of [0.1, 0.35, 0.5, 0.8]) {
    const pose = curlPose(progress);
    const relative = bends(pose);

    expect(relative[0]).toBeCloseTo(pose.strips[0], 9);
    for (let strip = 1; strip < STRIPS; strip++) {
      expect(relative[strip]).toBeCloseTo(relative[1], 9);
    }

    // Hung from one another, the bends add up to where the last strip actually is.
    const total = relative.reduce((sum, bend) => sum + bend, 0);
    expect(total).toBeCloseTo(pose.strips[STRIPS - 1], 9);
  }
});

test('a settle is drawn from where the leaf is to where it is going', () => {
  for (const [from, to] of [
    [0, 1],
    [0.3, 0],
    [0.7, 1],
  ]) {
    const frames = curlFrames(from, to);

    expect(frames.length).toBeGreaterThan(2);
    expect(frames[0]).toEqual(curlPose(from));
    expect(frames.at(-1)).toEqual(curlPose(to));
  }
});

// A zero-length settle — the reader asked for less motion, or let go right at the end — is
// still a settle, and still has somewhere to start and somewhere to land.
test('a settle that has nowhere to go is still two frames', () => {
  const frames = curlFrames(1, 1);
  expect(frames.length).toBeGreaterThanOrEqual(2);
  expect(frames[0]).toEqual(curlPose(1));
});

test('paper facing the reader is unshaded, and darkest edge-on', () => {
  expect(shade(0)).toBeCloseTo(0, 9);
  expect(shade(180)).toBeCloseTo(0, 9);
  expect(shade(90)).toBeCloseTo(SHADE, 9);

  for (let angle = 1; angle <= 90; angle++) {
    expect(shade(angle)).toBeGreaterThan(shade(angle - 1));
    // The back of the leaf catches the light the same way the front does.
    expect(shade(180 - angle)).toBeCloseTo(shade(angle), 9);
  }
});

test('turning forward is a negative rotation about the spine, and back a positive one', () => {
  expect(rotation('forward', 30)).toBe(-30);
  expect(rotation('backward', 30)).toBe(30);
  expect(rotation('forward', 0)).toBeCloseTo(0);
});

// What the component is handed: a rotation for each strip about the edge it hangs from, and
// the wash at either end of it — the one by its hinge and the one by its free edge — taken
// from the joins, so neighbouring strips agree where they meet.
test('each strip is drawn turned past the one it hangs from, shaded from its own two edges', () => {
  const pose = curlPose(0.4);
  const forward = stripsOf(pose, 'forward', eyeOf('spread', 'forward'));
  const backward = stripsOf(pose, 'backward', eyeOf('spread', 'backward'));

  expect(forward).toHaveLength(STRIPS);
  for (const [strip, bend] of bends(pose).entries()) {
    expect(forward[strip].transform).toBe(`rotateY(${-bend}deg)`);
    expect(backward[strip].transform).toBe(`rotateY(${bend}deg)`);
    expect(forward[strip].hinge).toBe(shade(pose.joins[strip]));
    expect(forward[strip].free).toBe(shade(pose.joins[strip + 1]));
    if (strip > 0) expect(forward[strip].hinge).toBe(forward[strip - 1].free);
  }
});

// Where the reader is looking from, relative to the spine: the perspective origin is the
// middle of the book, which on a wide desk is the spine itself and reading one leaf at a time
// is the middle of that leaf — towards the free edge of a leaf lifting off it to the right,
// and away from it for one coming back in from off the desk on the left.
test('the reader looks down on the book from the middle of it', () => {
  expect(eyeOf('spread', 'forward')).toEqual({ along: 0, above: PERSPECTIVE });
  expect(eyeOf('spread', 'backward')).toEqual({ along: 0, above: PERSPECTIVE });
  expect(eyeOf('single', 'forward')).toEqual({ along: 0.5, above: PERSPECTIVE });
  expect(eyeOf('single', 'backward')).toEqual({ along: -0.5, above: PERSPECTIVE });
});

test('a leaf shows its front before it turns and its back once it has', () => {
  for (const eye of [eyeOf('spread', 'forward'), eyeOf('single', 'forward')]) {
    expect(facing(curlPose(0), eye)).toEqual(Array(STRIPS).fill(true));
    expect(facing(curlPose(1), eye)).toEqual(Array(STRIPS).fill(false));
  }
});

// Seen from above the spine, the strip hinged on the spine is edge-on exactly at 90 degrees.
// A strip further out stands to one side of the reader, who goes on seeing its front for a
// little after it passes upright — which is why the face shown cannot be read off the angle.
test('a strip turns its back on the reader when it is edge-on to them, not at 90 degrees', () => {
  const eye = eyeOf('spread', 'forward');
  const [spine] = turnovers(0, 1, eye);
  expect(curlPose(spine!).strips[0]).toBeCloseTo(90, 3);

  const outer = turnovers(0, 1, eye).at(-1)!;
  expect(curlPose(outer).strips[STRIPS - 1]).toBeGreaterThan(90);
});

test('each strip turns over exactly once in a turn, where what it shows changes', () => {
  for (const eye of [
    eyeOf('spread', 'forward'),
    eyeOf('single', 'forward'),
    eyeOf('single', 'backward'),
  ]) {
    for (const [strip, at] of turnovers(0, 1, eye).entries()) {
      expect(at).toBeGreaterThan(0);
      expect(at).toBeLessThan(1);
      expect(facing(curlPose(at! - 1e-4), eye)[strip]).toBe(true);
      expect(facing(curlPose(at! + 1e-4), eye)[strip]).toBe(false);
    }
  }
});

// A settle is measured from wherever the leaf was let go, and can run either way: a leaf let
// go of short of halfway falls back and turns its face to the reader again.
test('a settle turns over only the strips it carries past edge-on, at its own share of the way', () => {
  const eye = eyeOf('spread', 'forward');
  const whole = turnovers(0, 1, eye);

  const late = turnovers(0.9, 1, eye);
  expect(late.every((at) => at === undefined)).toBe(true);

  const back = turnovers(0.6, 0, eye);
  for (const [strip, at] of back.entries()) {
    if (at === undefined) {
      expect(facing(curlPose(0.6), eye)[strip]).toBe(true);
      continue;
    }
    expect(0.6 + (0 - 0.6) * at).toBeCloseTo(whole[strip]!, 4);
  }
});

test('each strip is drawn with the side of the page that faces the reader', () => {
  const eye = eyeOf('spread', 'forward');
  const pose = curlPose(0.5);
  const looks = stripsOf(pose, 'forward', eye);
  expect(looks.map((look) => look.front)).toEqual(facing(pose, eye));
});
