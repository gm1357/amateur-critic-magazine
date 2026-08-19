import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flipAngle, prefersReducedMotion, turnDuration } from './flip';
import type { Direction, Mode } from './spread';
import { spreadOf } from './spread';

const EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export type Phase = 'rest' | 'animate';

export type Turning = {
  from: number;
  to: number;
  direction: Direction;
};

export type Flip = {
  displayed: number;
  phase: Phase;
  turning: Turning | undefined;
  turnRef: React.RefObject<HTMLDivElement | null>;
};

function directionOf(from: number, to: number): Direction {
  return to > from ? 'forward' : 'backward';
}

// The URL is the only thing that turns a page. Every way of moving through the issue —
// the pager, the arrow keys, a contents entry, and later a drag — changes the location,
// and this watches for the spread under it changing.
export function useFlip(mode: Mode, pageIndex: number): Flip {
  const target = pageIndex < 0 ? undefined : spreadOf(mode, pageIndex);

  const [displayed, setDisplayed] = useState(target ?? 0);
  const [phase, setPhase] = useState<Phase>('rest');
  const [turning, setTurning] = useState<Turning | undefined>(undefined);

  const turnRef = useRef<HTMLDivElement | null>(null);
  const animation = useRef<Animation | undefined>(undefined);
  const displayedMode = useRef(mode);

  // Deps are all primitives or state objects. A dependency on anything derived — a spread,
  // a plan — would be a fresh object on every render once the compiler is not memoising,
  // which is the case in the browser tests: the magazine would turn pages forever.
  useEffect(() => {
    if (target === undefined) return;

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
      setTurning({ from: displayed, to: target, direction: directionOf(displayed, target) });
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
      });
    }
  }, [target, displayed, phase, mode, turning]);

  // A layout effect, so the leaf's first painted frame is the one at 0 degrees — which is
  // arranged to be indistinguishable from the spread being left.
  useLayoutEffect(() => {
    if (phase !== 'animate' || !turning) return;

    const node = turnRef.current;
    if (!node) return;

    animation.current?.cancel();

    const animation_ = node.animate(
      [
        { transform: 'rotateY(0deg)' },
        { transform: `rotateY(${flipAngle(turning.direction, 1)}deg)` },
      ],
      {
        duration: turnDuration(prefersReducedMotion(), 1),
        easing: EASING,
        // Without this the last frame is dropped before React has committed the landed
        // spread, and the leaf snaps back for one frame on its way to arriving.
        fill: 'forwards',
      },
    );
    animation.current = animation_;

    let landed = false;
    animation_.finished
      .then(() => {
        if (landed) return;
        setDisplayed(turning.to);
        setPhase('rest');
        setTurning(undefined);
      })
      // cancel() rejects, which is how an interrupted turn reports itself.
      .catch(() => {});

    return () => {
      landed = true;
    };
  }, [phase, turning]);

  useEffect(() => {
    return () => animation.current?.cancel();
  }, []);

  return { displayed, phase, turning, turnRef };
}
