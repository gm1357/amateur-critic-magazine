import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  dragProgress,
  flipAngle,
  prefersReducedMotion,
  remainingTravel,
  settleTarget,
  swipeIntent,
  swipeThreshold,
  turnDuration,
} from './flip';
import type { Direction, Mode } from './spread';
import { spreadOf } from './spread';

const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export type Phase = 'rest' | 'drag' | 'animate';

export type Turning = {
  from: number;
  to: number;
  direction: Direction;
  settle: 'to' | 'from';
  progress: number;
};

type Gesture = {
  pointerId: number;
  // Undefined until a swipe has travelled far enough to say whether it is turning a page
  // or scrolling one. A grab on the page edge knows from the first moment.
  direction: Direction | undefined;
  to: number;
  leafWidth: number;
  threshold: number;
  startX: number;
  startY: number;
  progress: number;
  lastTime: number;
  velocity: number;
};

export type Flip = {
  displayed: number;
  phase: Phase;
  turning: Turning | undefined;
  bookRef: React.RefObject<HTMLDivElement | null>;
  turnRef: React.RefObject<HTMLDivElement | null>;
  grab: (event: React.PointerEvent<HTMLElement>, direction: Direction) => void;
  swipe: (event: React.PointerEvent<HTMLElement>) => void;
};

function directionOf(from: number, to: number): Direction {
  return to > from ? 'forward' : 'backward';
}

// The URL is the only thing that turns a page. Every way of moving through the issue —
// the pager, the arrow keys, a contents entry, a drag on the page edge — ends in a
// location change, and this watches the spread under it.
export function useFlip(
  mode: Mode,
  pageIndex: number,
  spreads: number,
  onTurn: (spread: number) => void,
): Flip {
  const target = pageIndex < 0 ? undefined : spreadOf(mode, pageIndex);

  const [displayed, setDisplayed] = useState(target ?? 0);
  const [phase, setPhase] = useState<Phase>('rest');
  const [turning, setTurning] = useState<Turning | undefined>(undefined);

  const bookRef = useRef<HTMLDivElement | null>(null);
  const turnRef = useRef<HTMLDivElement | null>(null);
  const animation = useRef<Animation | undefined>(undefined);
  const gesture = useRef<Gesture | undefined>(undefined);
  const displayedMode = useRef(mode);

  // A swipe that begins on a contents entry is still a swipe — most of that page is
  // links, and refusing to turn from them would make it nearly unswipeable. So the link
  // is followed only if the finger never went anywhere.
  const swallowClick = useRef(false);

  // The window listeners below are bound once, so they read the current spread from here
  // rather than closing over a stale one.
  const displayedAt = useRef(displayed);
  displayedAt.current = displayed;
  const spreadsAt = useRef(spreads);
  spreadsAt.current = spreads;

  // Held in a ref so the window listeners below can be attached once and never re-bound.
  const turned = useRef(onTurn);
  useLayoutEffect(() => {
    turned.current = onTurn;
  });

  // Deps are all primitives or state objects. A dep on anything derived — a spread, a
  // plan — would be a fresh object on every render once the compiler is not memoising,
  // which is the case in the browser tests: the magazine would turn pages forever.
  useEffect(() => {
    if (target === undefined || phase === 'drag') return;

    // Changing mode re-cuts the issue into different spreads. Nothing turned; the reader
    // is looking at a differently sized book.
    if (displayedMode.current !== mode) {
      displayedMode.current = mode;
      animation.current?.cancel();
      setDisplayed(target);
      setPhase('rest');
      setTurning(undefined);
      return;
    }

    if (phase === 'rest') {
      if (target === displayed) return;
      setTurning({
        from: displayed,
        to: target,
        direction: directionOf(displayed, target),
        settle: 'to',
        progress: 0,
      });
      setPhase('animate');
      return;
    }

    // A second turn asked for while a leaf is still in the air: land the one that is
    // turning and start the next from where it came down.
    if (turning && target !== turning.to) {
      animation.current?.cancel();
      setDisplayed(turning.to);
      setTurning({
        from: turning.to,
        to: target,
        direction: directionOf(turning.to, target),
        settle: 'to',
        progress: 0,
      });
    }
  }, [target, displayed, phase, mode, turning]);

  // A layout effect, so the leaf's first painted frame is the one it was already at —
  // which for a fresh turn is 0 degrees, arranged to be indistinguishable from the spread
  // being left, and for a released drag is wherever the reader let go.
  useLayoutEffect(() => {
    if (phase !== 'animate' || !turning) return;

    const node = turnRef.current;
    if (!node) return;

    animation.current?.cancel();

    const landed = turning.settle === 'to';
    const animation_ = node.animate(
      [
        { transform: `rotateY(${flipAngle(turning.direction, turning.progress)}deg)` },
        { transform: `rotateY(${flipAngle(turning.direction, landed ? 1 : 0)}deg)` },
      ],
      {
        duration: turnDuration(
          prefersReducedMotion(),
          remainingTravel(turning.progress, turning.settle),
        ),
        easing: EASING,
        // Without this the last frame is dropped before React has committed the landed
        // spread, and the leaf snaps back for one frame on its way to arriving.
        fill: 'forwards',
      },
    );
    animation.current = animation_;

    let interrupted = false;
    animation_.finished
      .then(() => {
        if (interrupted) return;
        setDisplayed(landed ? turning.to : turning.from);
        setPhase('rest');
        setTurning(undefined);
      })
      // cancel() rejects, which is how an interrupted turn reports itself.
      .catch(() => {});

    return () => {
      interrupted = true;
    };
  }, [phase, turning]);

  // Bound once, reading the gesture out of a ref, so the listener set never churns and a
  // drag never re-renders the four pages under it: the angle is written straight to the
  // node as a custom property.
  useEffect(() => {
    function angleTo(progress: number, direction: Direction) {
      turnRef.current?.style.setProperty('--flip-angle', `${flipAngle(direction, progress)}deg`);
    }

    function onMove(event: PointerEvent) {
      const held = gesture.current;
      if (!held || event.pointerId !== held.pointerId) return;

      if (held.direction === undefined) {
        resolve(held, event);
        return;
      }

      const progress = dragProgress(held.direction, event.clientX - held.startX, held.leafWidth);
      const elapsed = event.timeStamp - held.lastTime;
      if (elapsed > 0) held.velocity = ((progress - held.progress) * 1000) / elapsed;

      held.progress = progress;
      held.lastTime = event.timeStamp;
      angleTo(progress, held.direction);
    }

    // A swipe that never chose a direction was a reader's finger passing through, and
    // there is no leaf in the air to bring down.
    function resolve(held: Gesture, event: PointerEvent) {
      const intent = swipeIntent(
        event.clientX - held.startX,
        event.clientY - held.startY,
        held.threshold,
      );
      if (intent === 'pending') return;

      const to = intent === 'forward' ? displayedAt.current + 1 : displayedAt.current - 1;
      if (intent === 'scroll' || to < 0 || to >= spreadsAt.current) {
        gesture.current = undefined;
        return;
      }

      // Measured from here rather than from where the finger landed, so the leaf starts
      // at the reader's fingertip instead of jumping a threshold's worth to meet it.
      held.direction = intent;
      held.to = to;
      held.startX = event.clientX;
      held.lastTime = event.timeStamp;
      swallowClick.current = true;

      setTurning({
        from: displayedAt.current,
        to,
        direction: intent,
        settle: 'from',
        progress: 0,
      });
      setPhase('drag');
    }

    function onRelease(event: PointerEvent) {
      const held = gesture.current;
      if (!held || event.pointerId !== held.pointerId) return;

      gesture.current = undefined;
      if (held.direction === undefined) return;

      // The click lands in this same burst of events; anything still pending a tick later
      // was never coming, and must not swallow the reader's next real click.
      window.setTimeout(() => {
        swallowClick.current = false;
      }, 0);

      // A cancelled pointer is the browser deciding the gesture was someone else's — a
      // scroll, usually. The leaf falls back rather than turning on the reader.
      const settle =
        event.type === 'pointercancel' ? 'from' : settleTarget(held.progress, held.velocity);

      setTurning({
        from: displayedAt.current,
        to: held.to,
        direction: held.direction,
        settle,
        progress: held.progress,
      });
      setPhase('animate');

      // The URL moves the moment the reader commits, not when the paper lands: the pager
      // reports where you are, and a turn that has been let go of is already decided.
      if (settle === 'to') turned.current(held.to);
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
    // Capturing, so the click is stopped before it reaches the link it started on.
    window.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      window.removeEventListener('click', onClick, true);
    };
  }, []);

  useEffect(() => {
    return () => animation.current?.cancel();
  }, []);

  function grab(event: React.PointerEvent<HTMLElement>, direction: Direction) {
    if (phase !== 'rest' || gesture.current) return;

    const to = direction === 'forward' ? displayed + 1 : displayed - 1;
    if (to < 0 || to >= spreads) return;

    const leaf = bookRef.current?.querySelector('.a4-leaf');
    const leafWidth = leaf ? leaf.getBoundingClientRect().width : 0;
    if (leafWidth <= 0) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A synthetic pointer has nothing to capture. Every event still reaches the window
      // listeners, so the drag works either way — capture only buys a real pointer the
      // right to keep reporting once it leaves the window.
      void 0;
    }

    gesture.current = {
      pointerId: event.pointerId,
      direction,
      to,
      leafWidth,
      threshold: 0,
      startX: event.clientX,
      startY: event.clientY,
      progress: 0,
      lastTime: event.timeStamp,
      velocity: 0,
    };

    setTurning({ from: displayed, to, direction, settle: 'from', progress: 0 });
    setPhase('drag');
  }

  // A finger has the whole page to swipe across; a mouse has the page edge to take hold
  // of, which is a more precise instrument and a less accidental one.
  function swipe(event: React.PointerEvent<HTMLElement>) {
    if (phase !== 'rest' || gesture.current || event.pointerType === 'mouse') return;

    const leaf = bookRef.current?.querySelector('.a4-leaf');
    const leafWidth = leaf ? leaf.getBoundingClientRect().width : 0;
    if (leafWidth <= 0) return;

    gesture.current = {
      pointerId: event.pointerId,
      direction: undefined,
      to: displayed,
      leafWidth,
      threshold: swipeThreshold(leafWidth),
      startX: event.clientX,
      startY: event.clientY,
      progress: 0,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  }

  return { displayed, phase, turning, bookRef, turnRef, grab, swipe };
}
