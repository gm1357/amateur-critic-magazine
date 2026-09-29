import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { curlPose, rotation, SHADE, STRIPS } from '../../src/curl';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, reviewPath } from '../../src/pages';
import { folioOf, openAt } from './issue';
import { cancel, centreOf, drag } from './pointer';

const DESK = { width: 1280, height: 800 };
const viewport = { width: window.innerWidth, height: window.innerHeight };

afterEach(async () => {
  await page.viewport(viewport.width, viewport.height);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function bookOf(container: HTMLElement) {
  const book = container.querySelector('[data-spread]');
  if (!book) throw new Error('the issue is not open');
  return book;
}

function zoneOf(container: HTMLElement, which: 'next' | 'previous') {
  const zone = container.querySelector(`[data-turn-zone="${which}"]`);
  if (!zone) throw new Error(`no ${which} edge to take hold of`);
  return zone;
}

// The distance across a leaf, which is what a drag's progress is measured against.
function leafWidth(container: HTMLElement) {
  return container.querySelector('.a4-leaf')!.getBoundingClientRect().width;
}

// Which spread is open, as a number. Turns are asserted as moves from wherever the issue
// happened to open: it typesets itself, so an article that ran over has already moved
// every spread that comes after it.
function spreadAt(book: Element): number {
  return Number(book.getAttribute('data-spread'));
}

test('dragging the page edge most of the way across turns the page', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = spreadAt(book);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.8, y: grip.y });

  await expect.poll(() => spreadAt(book)).toBe(from + 1);
  expect(openAt(screen.container)).not.toContain(CONTENTS_PATH);
});

test('a page let go of before halfway falls back', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  // A step a frame, so how fast this drag is depends on the frame rate. Twelve steps came
  // to a leaf a second at 60Hz — close enough to a flick that a few early frames threw
  // the page over. Forty-eight keep it a slow placement at any rate a browser will run.
  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.2, y: grip.y }, { steps: 48 });

  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  expect(openAt(screen.container)).toEqual([CONTENTS_PATH]);
  expect(folioOf(screen.container)).toBe('2');
});

test('the leaf follows the hand while it is held', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const held = await drag(
    grip,
    { x: grip.x - leafWidth(screen.container) * 0.5, y: grip.y },
    {
      release: false,
    },
  );

  expect(book.getAttribute('data-phase')).toBe('drag');
  // Half a leaf dragged is half a turn, and every strip of the paper is where the curl puts
  // it halfway over — written straight to the nodes, so it is there without a frame to wait.
  const angles = anglesOf(screen.container.querySelector('.leaf-turn')!);
  const expected = curlPose(0.5).strips.map((angle) => rotation('forward', angle));
  for (const [strip, angle] of expected.entries()) expect(angles[strip]).toBeCloseTo(angle, 0);

  // Put the pointer down again so the gesture does not outlive the test.
  cancel(held, grip);
});

// Paper lifted by its edge curls: the free edge is further over than the paper by the spine,
// and every strip between them is turned a little further than the one it hangs from.
test('a leaf held in the air curls, its free edge ahead of the spine', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const held = await drag(
    grip,
    { x: grip.x - leafWidth(screen.container) * 0.3, y: grip.y },
    {
      release: false,
    },
  );

  const angles = anglesOf(screen.container.querySelector('.leaf-turn')!);
  expect(angles).toHaveLength(STRIPS);
  for (let strip = 1; strip < angles.length; strip++) {
    // Forward is a negative rotation, so further over is more negative.
    expect(angles[strip]).toBeLessThan(angles[strip - 1] - 1);
  }

  cancel(held, grip);
});

// A strip shows whichever side of the leaf faces the reader, and only that side. The back is
// printed mirror-wise on the same face as the front, so that seen from behind it reads the
// right way round.
test('a leaf held past upright shows its front by the spine and its back at the free edge', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const held = await drag(
    grip,
    { x: grip.x - leafWidth(screen.container) * 0.55, y: grip.y },
    {
      release: false,
    },
  );

  const shown = [...screen.container.querySelectorAll('.leaf-strip')].map((strip) => {
    const sides = [...strip.querySelectorAll(':scope > .leaf-face > .leaf-print')].filter(
      (print) => getComputedStyle(print).visibility === 'visible',
    );
    expect(sides).toHaveLength(1);
    return sides[0].getAttribute('data-face');
  });

  expect(shown).toHaveLength(STRIPS);
  expect(shown[0]).toBe('front');
  expect(shown.at(-1)).toBe('back');

  const back = screen.container.querySelector('.leaf-print[data-face="back"]')!;
  expect(getComputedStyle(back).transform).toBe('matrix(-1, 0, 0, 1, 0, 0)');

  cancel(held, grip);
});

// Where two strips meet, each covers only part of the pixels along the cut, so whatever is
// under the leaf shows through as a hairline — the page being turned onto, flickering past
// every cut in a quick turn. Laid over a white page and held in the air as plain paper, the
// leaf lets any of that light show, and none of it may.
test('no light gets through the cuts in a leaf held in the air', async () => {
  // Short enough to fit the headless window: a test frame taller than it is scaled down to
  // fit, and a hairline a pixel wide is resampled into something that cannot be measured.
  await page.viewport(400, 700);
  const screen = await renderAt(CONTENTS_PATH);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const glare = document.createElement('style');
  glare.textContent = `
    .magazine-book > .a4-leaf { background: #fff !important; }
    .magazine-book > .a4-leaf *, .leaf-turn .a4-leaf > * { visibility: hidden !important; }
  `;
  document.head.append(glare);

  try {
    const held = await drag(
      grip,
      { x: grip.x - leafWidth(screen.container) * 0.3, y: grip.y },
      {
        release: false,
      },
    );
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const pixels = await snapshot();
    // Each strip's face runs from the cut it hangs from; the strip itself is a whole leaf wide.
    const strips = [...screen.container.querySelectorAll('.leaf-strip > .leaf-face')].map((face) =>
      face.getBoundingClientRect(),
    );
    expect(strips).toHaveLength(STRIPS);

    // The middle of the page, clear of the top and bottom edges that perspective slants.
    const top = strips[0].top + strips[0].height * 0.3;
    const bottom = strips[0].top + strips[0].height * 0.7;

    // The paper itself is dark, about 20: a column through the middle of a strip is the
    // baseline. The white page showing through a cut came out at 70 to 90.
    const middle = (strips[1].left + strips[1].right) / 2;
    expect(brightest(pixels, middle, middle, top, bottom)).toBeLessThan(40);

    for (const strip of strips.slice(1)) {
      expect(brightest(pixels, strip.left - 1.5, strip.left + 1.5, top, bottom)).toBeLessThan(40);
    }

    cancel(held, grip);
  } finally {
    glare.remove();
  }
});

// The leaf in the air draws its page's side edges itself, and the moment it is taken hold of
// it has to be the page it was: the rule down the side of the paper is still there.
test('a leaf taken hold of keeps the rules down both sides of its page', async () => {
  await page.viewport(400, 700);
  const screen = await renderAt(CONTENTS_PATH);
  const grip = centreOf(zoneOf(screen.container, 'next'));
  const paper = screen.container.querySelector('.a4-leaf')!.getBoundingClientRect();

  const held = await drag(grip, { x: grip.x - 1, y: grip.y }, { release: false, steps: 2 });
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);

  const pixels = await snapshot();
  const top = paper.top + paper.height * 0.3;
  const bottom = paper.top + paper.height * 0.7;
  // The rule is the one colour on the page that is bluer than it is red — by 12, where the
  // paper and the desk are by 2 or 3. At the free edge, which the grip has already lifted a
  // hair off the pixel grid, it is shared between two columns and comes out at about 9.
  for (const edge of [paper.left, paper.right]) {
    const columns = [-2, -1, 0, 1].map((step) => bluest(pixels, edge + step, top, bottom));
    expect(Math.max(...columns)).toBeGreaterThan(7);
  }

  cancel(held, grip);
});

// The paper darkens as it turns edge-on to the reader. Halfway over, the curl runs from 60
// to 120 degrees, so the join at the top of it is exactly edge-on and nothing is lit flat.
test('a leaf held in the air is shaded where it turns away from the reader', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const held = await drag(
    grip,
    { x: grip.x - leafWidth(screen.container) * 0.5, y: grip.y },
    {
      release: false,
    },
  );

  const shades = [...screen.container.querySelectorAll('.leaf-turn [data-shade]')].map((node) =>
    Number(getComputedStyle(node).opacity),
  );
  expect(Math.max(...shades)).toBeCloseTo(SHADE, 2);
  for (const opacity of shades) expect(opacity).toBeGreaterThan(0);

  cancel(held, grip);
});

test('the edge can be taken hold of in either direction', async () => {
  const screen = await renderAt(reviewPath(reviews[0].slug));
  const book = bookOf(screen.container);
  const from = spreadAt(book);
  const grip = centreOf(zoneOf(screen.container, 'previous'));

  await drag(grip, { x: grip.x + leafWidth(screen.container) * 0.8, y: grip.y });

  await expect.poll(() => spreadAt(book)).toBe(from - 1);
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();
});

// The browser sends this when it decides the gesture was really someone else's.
test('a cancelled gesture drops the page rather than turning it', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  const held = await drag(
    grip,
    { x: grip.x - leafWidth(screen.container) * 0.9, y: grip.y },
    {
      release: false,
    },
  );
  cancel(held, grip);

  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  expect(openAt(screen.container)).toEqual([CONTENTS_PATH]);
});

test('the cover has no edge to turn back from, and the back cover none to turn forward', async () => {
  const cover = await renderAt('/');
  expect(cover.container.querySelector('[data-turn-zone="previous"]')).toBeNull();
  expect(cover.container.querySelector('[data-turn-zone="next"]')).not.toBeNull();

  const end = await renderAt(BACK_PATH);
  expect(end.container.querySelector('[data-turn-zone="next"]')).toBeNull();
});

test('on a wide desk a drag turns a whole leaf, both pages of it', async () => {
  await page.viewport(DESK.width, DESK.height);
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = spreadAt(book);
  const open = openAt(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));

  await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.8, y: grip.y });

  // One turn past both pages that were open, and the pager prints the range it landed on.
  await expect.poll(() => spreadAt(book)).toBe(from + 1);
  expect(openAt(screen.container)).toHaveLength(2);
  expect(openAt(screen.container).some((path) => open.includes(path))).toBe(false);
  expect(folioOf(screen.container)).toMatch(/^\d+–\d+$/);
});

// Real input, through the browser's own hit-testing and event ordering, rather than
// events this suite constructed for itself.
test('a real pointer drag turns the page as well', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const from = spreadAt(book);

  await userEvent.dragAndDrop(
    zoneOf(screen.container, 'next'),
    screen.container.querySelector('[data-page]')!,
    // `force` because the leaf being dragged is under the cursor and would fail the drop
    // target's hit test; `steps` because the default is a single move, which is a
    // degenerate drag with no travel to measure; `targetPosition` because the middle of
    // the page is exactly the halfway line, and a test should not sit on it.
    { force: true, steps: 12, targetPosition: { x: 4, y: 120 } },
  );

  await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
  expect(spreadAt(book)).toBe(from + 1);
});

// A leaf let go of past halfway carries on from where the hand left it. The bug this
// guards against was the URL arriving a commit after the state that starts the settle,
// which read as the reader asking for a different page and restarted the turn from flat:
// the paper snapped back to the desk and turned again, over the full duration.
test('a released leaf carries on from where it was let go, never from flat', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const book = bookOf(screen.container);
  const grip = centreOf(zoneOf(screen.container, 'next'));
  const watch = track(book);

  // Stopped whatever happens: a sampler left running would keep asking the browser for a
  // frame for the rest of the suite.
  let angles: number[][];
  try {
    await drag(grip, { x: grip.x - leafWidth(screen.container) * 0.7, y: grip.y });
    await expect.poll(() => book.getAttribute('data-phase')).toBe('rest');
    angles = watch.angles;
  } finally {
    watch.stop();
  }

  // A forward turn only ever goes one way, every part of it. Anything else is the leaf being
  // put back.
  expect(angles.at(-1)).toHaveLength(STRIPS);
  for (const angle of angles.at(-1)!) expect(angle).toBeCloseTo(-180, 0);
  for (const [step, frame] of angles.entries()) {
    if (step === 0) continue;
    for (const [strip, angle] of frame.entries()) {
      expect(angle).toBeLessThanOrEqual(angles[step - 1][strip] + 0.5);
    }
  }
});

// Where every strip of the leaf is, spine first, read back off the composited matrices rather
// than off anything the drag wrote, because the settle is a Web Animation. Each strip is turned
// about the spine through every strip before it, so its own matrix is where it lies. A strip
// nothing has turned yet lies flat.
function anglesOf(leaf: Element): number[] {
  return [...leaf.querySelectorAll('.leaf-strip')].map((strip) => {
    const transform = getComputedStyle(strip).transform;
    if (!transform.startsWith('matrix3d')) return 0;
    const cells = transform.slice(9, -1).split(',').map(Number);
    return (Math.atan2(-cells[2], cells[0]) * 180) / Math.PI;
  });
}

function track(book: Element) {
  const angles: number[][] = [];
  let running = true;

  function sample() {
    if (!running) return;
    const leaf = book.querySelector('.leaf-turn');
    if (leaf) angles.push(anglesOf(leaf));
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);

  return {
    angles,
    stop: () => {
      running = false;
    },
  };
}

// What is actually on the screen, composited, as pixels this page can read.
async function snapshot(): Promise<ImageData> {
  const png = await page.screenshot({ save: false });
  const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

// The brightest pixel in a box given in CSS pixels, as the largest of its three channels.
function brightest(pixels: ImageData, left: number, right: number, top: number, bottom: number) {
  const scale = pixels.width / window.innerWidth;
  let most = 0;
  for (let y = Math.floor(top * scale); y <= Math.ceil(bottom * scale); y++) {
    for (let x = Math.floor(left * scale); x <= Math.ceil(right * scale); x++) {
      const at = (y * pixels.width + x) * 4;
      most = Math.max(most, pixels.data[at], pixels.data[at + 1], pixels.data[at + 2]);
    }
  }
  return most;
}

// How much bluer than red the bluest pixel in a column is, as the leaf's rule is.
function bluest(pixels: ImageData, x: number, top: number, bottom: number) {
  const scale = pixels.width / window.innerWidth;
  const column = Math.floor(x * scale);
  let most = -255;
  for (let y = Math.floor(top * scale); y <= Math.ceil(bottom * scale); y++) {
    const at = (y * pixels.width + column) * 4;
    most = Math.max(most, pixels.data[at + 2] - pixels.data[at]);
  }
  return most;
}
