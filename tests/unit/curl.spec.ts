import { expect, test } from 'vitest';
import {
  bends,
  chainOf,
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

// What the component is handed for each strip besides where it is: the wash at either end of
// it — the one by its hinge and the one by its free edge — taken from the joins, so
// neighbouring strips agree where they meet.
test('each strip is shaded from its own two edges', () => {
  const pose = curlPose(0.4);
  const looks = stripsOf(pose, 'forward', eyeOf('spread', 'forward'));

  expect(looks).toHaveLength(STRIPS);
  for (const [strip, look] of looks.entries()) {
    expect(look.hinge).toBe(shade(pose.joins[strip]));
    expect(look.free).toBe(shade(pose.joins[strip + 1]));
    if (strip > 0) expect(look.hinge).toBe(looks[strip - 1].free);
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

// The progress at which a strip stops showing the reader its front, found by halving.
function turnoverOf(strip: number, eye: ReturnType<typeof eyeOf>): number {
  let low = 0;
  let high = 1;
  for (let halving = 0; halving < 50; halving++) {
    const middle = (low + high) / 2;
    if (facing(curlPose(middle), eye)[strip]) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

// Seen from above the spine, the strip hinged on the spine is edge-on exactly at 90 degrees.
// A strip further out stands to one side of the reader, who goes on seeing its front for a
// little after it passes upright — which is why the face shown cannot be read off the angle.
test('a strip turns its back on the reader when it is edge-on to them, not at 90 degrees', () => {
  const eye = eyeOf('spread', 'forward');
  expect(curlPose(turnoverOf(0, eye)).strips[0]).toBeCloseTo(90, 6);
  expect(curlPose(turnoverOf(STRIPS - 1, eye)).strips[STRIPS - 1]).toBeGreaterThan(90);
});

test('each strip turns its back on the reader once in a turn, and only once', () => {
  for (const eye of [
    eyeOf('spread', 'forward'),
    eyeOf('single', 'forward'),
    eyeOf('single', 'backward'),
  ]) {
    for (let strip = 0; strip < STRIPS; strip++) {
      let changes = 0;
      let before = facing(curlPose(0), eye)[strip];
      for (const progress of GRID.slice(1)) {
        const now = facing(curlPose(progress), eye)[strip];
        if (now !== before) changes++;
        before = now;
      }
      expect(changes).toBe(1);
    }
  }
});

test('each strip is drawn with the side of the page that faces the reader', () => {
  const eye = eyeOf('spread', 'forward');
  const pose = curlPose(0.5);
  const looks = stripsOf(pose, 'forward', eye);
  expect(looks.map((look) => look.front)).toEqual(facing(pose, eye));
});

type Point = [number, number];

// Walks a strip's steps out from the spine, in leaf widths along the paper's resting direction
// and up off the book, and says where the strip's hinge ends up and which way it faces.
function walk(steps: ReturnType<typeof chainOf>[number]): { at: Point; heading: number } {
  let heading = 0;
  let at: Point = [0, 0];
  for (const step of steps) {
    if ('turn' in step) heading += step.turn;
    else at = ahead(at, heading, step.along);
  }
  return { at, heading };
}

function ahead([along, above]: Point, heading: number, distance: number): Point {
  const radians = (heading * Math.PI) / 180;
  return [along + distance * Math.cos(radians), above + distance * Math.sin(radians)];
}

// Where each cut in the paper is, spine first and free edge last.
function cutsAt(progress: number): Point[] {
  const edges = stripEdges();
  const cuts: Point[] = [[0, 0]];
  for (const [strip, angle] of curlPose(progress).strips.entries()) {
    cuts.push(ahead(cuts[strip], angle, edges[strip + 1] - edges[strip]));
  }
  return cuts;
}

// Every strip is drawn on its own, turned about the spine through every strip before it: its
// hinge lands exactly on the cut it hangs from, and it lies at its own angle. Walked out from
// the same steps, two neighbours cannot disagree about where they meet.
test('each strip is walked out from the spine to the cut it hangs from', () => {
  for (const progress of [0, 0.15, 0.4, 0.5, 0.75, 1]) {
    const pose = curlPose(progress);
    const cuts = cutsAt(progress);

    for (const [strip, steps] of chainOf(pose).entries()) {
      const { at, heading } = walk(steps);
      expect(Math.hypot(at[0] - cuts[strip][0], at[1] - cuts[strip][1])).toBeLessThan(1e-9);
      expect(heading).toBeCloseTo(pose.strips[strip], 9);
    }
  }
});

// Every strip is the same run of functions at every pose, which is what lets the browser
// interpolate a settle between two poses — and between two samples every strip moves through
// the same turns, so their hinges stay shut all the way.
test('each strip is drawn as the same run of turns and slides at every pose', () => {
  const eye = eyeOf('spread', 'forward');
  const shape = (transform: string) => transform.replace(/\([^)]*\)/g, '()');
  const early = stripsOf(curlPose(0.2), 'forward', eye);
  const late = stripsOf(curlPose(0.8), 'forward', eye);

  for (const [strip, look] of early.entries()) {
    expect(shape(look.transform)).toBe(shape(late[strip].transform));
  }

  // Forward the paper runs right from the spine and turns the negative way; back, the mirror.
  const forward = stripsOf(curlPose(0.3), 'forward', eye)[1].transform;
  const backward = stripsOf(curlPose(0.3), 'backward', eyeOf('spread', 'backward'))[1].transform;
  expect(forward).toMatch(/^rotateY\(-[\d.]+deg\) translateX\([\d.]+%\) rotateY\(-[\d.]+deg\)$/);
  expect(backward).toMatch(/^rotateY\([\d.]+deg\) translateX\(-[\d.]+%\) rotateY\([\d.]+deg\)$/);
});
