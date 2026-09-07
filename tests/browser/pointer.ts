// The suite's first pointer simulation. `userEvent` from vitest/browser has no low-level
// pointer API — the Playwright provider exposes click, hover, dragAndDrop and friends,
// none of which can hold a button down and report an exact position on the way across.
// Real PointerEvents can, they are constructible in both Chromium and Firefox, and they
// need no hit-testing, which matters here because the leaf being dragged is under the
// cursor for the whole gesture.
function fire(
  target: Element,
  type: string,
  x: number,
  y: number,
  pointerType = 'mouse',
  pointerId = 1,
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId,
      pointerType,
      // Only the first finger down is the primary one; a pinch needs a second that is not.
      isPrimary: pointerId === 1,
      button: type === 'pointermove' ? -1 : 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: x,
      clientY: y,
    }),
  );
}

export type Point = { x: number; y: number };

export function centreOf(element: Element): Point {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

// Events are dispatched on an element, never on `window`: an event dispatched at the
// window never travels down to the page, so a broken implementation would still pass.
// Each move is aimed afresh at whatever is under the pointer, the way a real one is —
// the element the gesture began on is often gone by the second frame, because the page it
// belonged to has just been handed to the leaf in the air.
export async function drag(
  from: Point,
  to: Point,
  { release = true, steps = 12, pointerType = 'mouse' } = {},
) {
  const target = document.elementFromPoint(from.x, from.y);
  if (!target) throw new Error('nothing to take hold of at that point');

  fire(target, 'pointerdown', from.x, from.y, pointerType);

  let at = from;
  for (let step = 1; step <= steps; step++) {
    const travelled = step / steps;
    at = {
      x: from.x + (to.x - from.x) * travelled,
      y: from.y + (to.y - from.y) * travelled,
    };
    fire(under(at), 'pointermove', at.x, at.y, pointerType);
    await new Promise(requestAnimationFrame);
  }

  if (release) fire(under(at), 'pointerup', at.x, at.y, pointerType);
  return under(at);
}

function under(at: Point): Element {
  return document.elementFromPoint(at.x, at.y) ?? document.body;
}

// A finger, which may swipe anywhere on the page rather than only on its edge.
export function swipe(from: Point, to: Point, options: { release?: boolean; steps?: number } = {}) {
  return drag(from, to, { ...options, pointerType: 'touch' });
}

export function cancel(target: Element, at: Point) {
  fire(target, 'pointercancel', at.x, at.y);
}

// Two fingers, moving at once. Playwright's `userEvent` has no multi-touch API at all, which
// is the same reason the rest of this file exists — and a pinch is the one gesture that
// cannot be faked with a single pointer, since it is defined by the gap between two.
export async function pinch(from: [Point, Point], to: [Point, Point], { steps = 8 } = {}) {
  const target = document.elementFromPoint(from[0].x, from[0].y) ?? document.body;

  from.forEach((at, finger) => fire(target, 'pointerdown', at.x, at.y, 'touch', finger + 1));

  for (let step = 1; step <= steps; step++) {
    const travelled = step / steps;

    from.forEach((start, finger) => {
      const at = {
        x: start.x + (to[finger].x - start.x) * travelled,
        y: start.y + (to[finger].y - start.y) * travelled,
      };
      fire(target, 'pointermove', at.x, at.y, 'touch', finger + 1);
    });

    await new Promise(requestAnimationFrame);
  }

  to.forEach((at, finger) => fire(target, 'pointerup', at.x, at.y, 'touch', finger + 1));
}

// A tap that goes nowhere. Two of them in quick succession is a double tap — which this
// suite has to build out of pointers, because engines synthesise `dblclick` from a finger
// differently and some do not synthesise it at all.
export async function tap(at: Point, times = 1) {
  for (let count = 0; count < times; count++) {
    const target = document.elementFromPoint(at.x, at.y) ?? document.body;

    fire(target, 'pointerdown', at.x, at.y, 'touch');
    fire(target, 'pointerup', at.x, at.y, 'touch');
    await new Promise(requestAnimationFrame);
  }
}
