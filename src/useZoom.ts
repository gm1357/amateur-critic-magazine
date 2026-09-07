import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  anchoredScroll,
  gapBetween,
  isDoubleTap,
  midpoint,
  MIN_SCALE,
  pinchScale,
  type Point,
  stepScale,
  type Tap,
  tapScale,
  wheelScale,
  zoomedIn,
} from './zoom';

export type Zoom = {
  scale: number;
  zoomed: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  press: (event: React.PointerEvent<HTMLElement>) => void;
  stepIn: () => void;
  stepOut: () => void;
};

type Pinch = { ids: [number, number]; gap: number; scale: number };
type Pan = { id: number; at: Point; travelled: number };

// A pan has to travel this far before the click that ends it is swallowed. Below it the
// gesture was a tap, and a tap on a contents entry still follows the entry.
const PAN_SLOP = 6;

function pointIn(viewport: HTMLElement, event: { clientX: number; clientY: number }): Point {
  const box = viewport.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

// Magnifying the page is a view laid over a fixed layout: the transform never changes what
// the leaf measures, so nothing here can re-typeset the issue. Panning is the browser
// scrolling the window the book is read through — which is where the clamping comes from,
// free and exact, because a scroll offset cannot leave its own content.
//
// `abort` is how this stands the page-turn machinery down: the moment a gesture becomes a
// pinch or a pan, whatever the flip had opened is let go of.
export function useZoom(abort: () => void): Zoom {
  const [scale, setScale] = useState(MIN_SCALE);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Live gesture state, in refs: a pan writes the scroll offset straight to the node, so
  // dragging a magnified page never re-renders the pages under it.
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | undefined>(undefined);
  const pan = useRef<Pan | undefined>(undefined);
  const lastTap = useRef<Tap | undefined>(undefined);
  const swallowClick = useRef(false);

  // The scroll offset the page was at when a scale change was asked for, and the point it
  // was asked about. Captured before the change because the browser clamps the offset the
  // moment the content shrinks under it, which loses where the reader was.
  const anchored = useRef<{ scroll: Point; at: Point; from: number } | undefined>(undefined);

  const scaleAt = useRef(scale);
  scaleAt.current = scale;
  const aborted = useRef(abort);
  aborted.current = abort;

  function magnify(to: number, at: Point) {
    const viewport = viewportRef.current;
    if (!viewport || to === scaleAt.current) return;

    anchored.current = {
      scroll: { x: viewport.scrollLeft, y: viewport.scrollTop },
      at,
      from: scaleAt.current,
    };
    setScale(to);
  }

  // After the paper has been re-scaled, and not before: the offsets it is being moved to
  // only exist once there is that much page to scroll.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const held = anchored.current;
    anchored.current = undefined;
    if (!viewport || !held) return;

    viewport.scrollLeft = anchoredScroll(held.scroll.x, held.at.x, held.from, scale);
    viewport.scrollTop = anchoredScroll(held.scroll.y, held.at.y, held.from, scale);
  }, [scale]);

  // Bound once, reading the gesture out of refs, so the listener set never churns — the
  // same reason `useFlip` binds its own this way.
  useEffect(() => {
    function onMove(event: PointerEvent) {
      const viewport = viewportRef.current;
      if (!viewport || !pointers.current.has(event.pointerId)) return;

      const at = pointIn(viewport, event);
      pointers.current.set(event.pointerId, at);

      const pinching = pinch.current;
      if (pinching) {
        const [a, b] = pinching.ids.map((id) => pointers.current.get(id));
        if (!a || !b) return;

        magnify(pinchScale(pinching.scale, pinching.gap, gapBetween(a, b)), midpoint(a, b));
        return;
      }

      const panning = pan.current;
      if (!panning || panning.id !== event.pointerId) return;

      // Straight to the node. The page follows the hand rather than a render.
      viewport.scrollLeft -= at.x - panning.at.x;
      viewport.scrollTop -= at.y - panning.at.y;

      panning.travelled += gapBetween(at, panning.at);
      panning.at = pointIn(viewport, event);
      if (panning.travelled > PAN_SLOP) swallowClick.current = true;
    }

    function onRelease(event: PointerEvent) {
      pointers.current.delete(event.pointerId);

      const pinching = pinch.current;
      if (pinching?.ids.includes(event.pointerId)) {
        pinch.current = undefined;

        // One finger left on a magnified page goes on panning it, rebased where it is now,
        // so the paper does not jump as the other finger lifts.
        const [survivor] = [...pointers.current.entries()];
        if (survivor && zoomedIn(scaleAt.current)) {
          pan.current = { id: survivor[0], at: survivor[1], travelled: PAN_SLOP + 1 };
        }
      }

      if (pan.current?.id === event.pointerId) pan.current = undefined;

      // The click lands in this same burst of events; anything still pending a tick later
      // was never coming, and must not swallow the reader's next real click.
      if (swallowClick.current) {
        window.setTimeout(() => {
          swallowClick.current = false;
        }, 0);
      }
    }

    function onClick(event: MouseEvent) {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    window.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      window.removeEventListener('click', onClick, true);
    };
  }, []);

  // React attaches `wheel` passively, so `preventDefault` from an onWheel prop is ignored
  // and the browser would zoom the whole document instead of the page. It has to be a
  // native listener. A trackpad pinch arrives here as a wheel with ctrl held.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onWheel(event: WheelEvent) {
      if (!viewport) return;
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      magnify(wheelScale(scaleAt.current, event.deltaY), pointIn(viewport, event));
    }

    // A second finger must not be handed to the browser as a scroll. touch-action is latched
    // when a touch sequence begins, so an attribute flipped as that finger lands is already
    // too late for the pinch that flipped it.
    function onTouchStart(event: TouchEvent) {
      if (event.touches.length > 1) event.preventDefault();
    }

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('touchstart', onTouchStart, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  function press(event: React.PointerEvent<HTMLElement>) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const at = pointIn(viewport, event);
    pointers.current.set(event.pointerId, at);

    // A double tap is a finger's gesture. A mouse is not offered it — it has the buttons and
    // the wheel, which are more precise instruments and less accidental ones, the same
    // reason `useFlip` does not offer a mouse the swipe.
    //
    // A tap that lands on a link is the reader following it, not asking for a closer look —
    // and it must not arm a double tap either, or the first tap somewhere on the page they
    // just landed on would complete a gesture they never made.
    const finger = event.pointerType !== 'mouse';
    const onLink = (event.target as HTMLElement | null)?.closest('a, button');

    if (finger && !onLink) {
      const tap: Tap = { at, time: event.timeStamp };

      if (isDoubleTap(lastTap.current, tap)) {
        lastTap.current = undefined;
        aborted.current();
        magnify(tapScale(scaleAt.current), at);
        return;
      }
      lastTap.current = tap;
    } else {
      lastTap.current = undefined;
    }

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.entries()];
      aborted.current();
      pan.current = undefined;
      pinch.current = {
        ids: [a[0], b[0]],
        gap: gapBetween(a[1], b[1]),
        scale: scaleAt.current,
      };
      return;
    }

    if (pointers.current.size === 1 && zoomedIn(scaleAt.current)) {
      aborted.current();
      pan.current = { id: event.pointerId, at, travelled: 0 };
    }
  }

  function step(direction: 'in' | 'out') {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Anchored on the middle of the window, which is what the reader is looking at.
    const box = viewport.getBoundingClientRect();
    magnify(stepScale(scaleAt.current, direction), { x: box.width / 2, y: box.height / 2 });
  }

  return {
    scale,
    zoomed: zoomedIn(scale),
    viewportRef,
    press,
    stepIn: () => step('in'),
    stepOut: () => step('out'),
  };
}
