import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  dragProgress,
  flipAngle,
  prefersReducedMotion,
  remainingTravel,
  settleTarget,
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
  direction: Direction;
  to: number;
  leafWidth: number;
  startX: number;
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

  // The window listeners below are bound once, so they read the current spread from here
  // rather than closing over a stale one.
  const displayedAt = useRef(displayed);
  displayedAt.current = displayed;

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

      const progress = dragProgress(held.direction, event.clientX - held.startX, held.leafWidth);
      const elapsed = event.timeStamp - held.lastTime;
      if (elapsed > 0) held.velocity = ((progress - held.progress) * 1000) / elapsed;

      held.progress = progress;
      held.lastTime = event.timeStamp;
      angleTo(progress, held.direction);
    }

    function onRelease(event: PointerEvent) {
      const held = gesture.current;
      if (!held || event.pointerId !== held.pointerId) return;

      gesture.current = undefined;

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

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
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
      startX: event.clientX,
      progress: 0,
      lastTime: event.timeStamp,
      velocity: 0,
    };

    setTurning({ from: displayed, to, direction, settle: 'from', progress: 0 });
    setPhase('drag');
  }

  return { displayed, phase, turning, bookRef, turnRef, grab };
}
