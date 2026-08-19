// The suite's first pointer simulation. `userEvent` from vitest/browser has no low-level
// pointer API — the Playwright provider exposes click, hover, dragAndDrop and friends,
// none of which can hold a button down and report an exact position on the way across.
// Real PointerEvents can, they are constructible in both Chromium and Firefox, and they
// need no hit-testing, which matters here because the leaf being dragged is under the
// cursor for the whole gesture.
function fire(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
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

// Events are dispatched on the element, never on `window`: an event dispatched at the
// window never travels down to the page, so a broken implementation would still pass.
export async function drag(from: Point, to: Point, { release = true, steps = 12 } = {}) {
  const target = document.elementFromPoint(from.x, from.y);
  if (!target) throw new Error('nothing to take hold of at that point');

  fire(target, 'pointerdown', from.x, from.y);

  for (let step = 1; step <= steps; step++) {
    const travelled = step / steps;
    fire(
      target,
      'pointermove',
      from.x + (to.x - from.x) * travelled,
      from.y + (to.y - from.y) * travelled,
    );
    await new Promise(requestAnimationFrame);
  }

  if (release) fire(target, 'pointerup', to.x, to.y);
  return target;
}

export function cancel(target: Element, at: Point) {
  fire(target, 'pointercancel', at.x, at.y);
}
