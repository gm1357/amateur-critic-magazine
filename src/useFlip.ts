import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { curlPose, eyeOf, stripsOf } from './curl';
import type { StripLook } from './curl';
import type { Sample } from './flip';
import {
  dragProgress,
  flickVelocity,
  prefersReducedMotion,
  remainingTravel,
  settleTarget,
  swipeIntent,
  swipeThreshold,
  trail,
  turnDuration,
  turnEasing,
} from './flip';
import type { Direction, Mode } from './spread';
import { spreadOf } from './spread';

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
  // The recent trail of the gesture, which is what a flick is measured over.
  samples: Sample[];
};

export type Flip = {
  displayed: number;
  phase: Phase;
  turning: Turning | undefined;
  abort: () => void;
  bookRef: React.RefObject<HTMLDivElement | null>;
  turnRef: React.RefObject<HTMLDivElement | null>;
  grab: (event: React.PointerEvent<HTMLElement>, direction: Direction) => void;
  swipe: (event: React.PointerEvent<HTMLElement>) => void;
};

function directionOf(from: number, to: number): Direction {
  return to > from ? 'forward' : 'backward';
}

// The paper in the air, spine first: each strip, the two sides of the page printed on its
// face, and the washes by its hinge and by its free edge.
type Paper = {
  strip: HTMLElement;
  front: HTMLElement;
  back: HTMLElement;
  hinge: HTMLElement;
  free: HTMLElement;
}[];

function paperOf(leaf: HTMLElement): Paper {
  return [...leaf.querySelectorAll<HTMLElement>('.leaf-strip')].map((strip) => {
    const on = (selector: string) =>
      strip.querySelector<HTMLElement>(`:scope > .leaf-face > ${selector}`)!;

    return {
      strip,
      front: on('[data-face="front"]'),
      back: on('[data-face="back"]'),
      hinge: on('[data-shade="hinge"]'),
      free: on('[data-shade="free"]'),
    };
  });
}

function shown(visible: boolean): string {
  return visible ? 'visible' : 'hidden';
}

// A drag writes the pose straight onto the paper, so holding a leaf never re-renders the
// sixteen copies of a page it is cut from.
function draw(paper: Paper, looks: StripLook[]) {
  for (const [strip, { back, free, front, hinge, strip: node }] of paper.entries()) {
    const look = looks[strip];
    node.style.transform = look.transform;
    hinge.style.opacity = String(look.hinge);
    free.style.opacity = String(look.free);
    front.style.visibility = shown(look.front);
    back.style.visibility = shown(!look.front);
  }
}

// A settle in the air: the clock it keeps time by, and the frame it will draw next.
type Flight = { clock: Animation; frame: number };

function ground(flight: Flight | undefined) {
  if (!flight) return;
  flight.clock.cancel();
  cancelAnimationFrame(flight.frame);
}

// The URL is the only thing that turns a page. Every way of moving through the issue —
// the pager, the arrow keys, a contents entry, a drag on the page edge — ends in a
// location change, and this watches the spread under it.
export function useFlip(
  mode: Mode,
  pageIndex: number,
  spreads: number,
  onTurn: (spread: number) => void,
  // How the issue is currently cut into pages — the mode it is read in, and the typesetting
  // it was counted into. See the guard below.
  edition: string,
): Flip {
  const target = pageIndex < 0 ? undefined : spreadOf(mode, pageIndex);

  const [displayed, setDisplayed] = useState(target ?? 0);
  const [phase, setPhase] = useState<Phase>('rest');
  const [turning, setTurning] = useState<Turning | undefined>(undefined);

  const bookRef = useRef<HTMLDivElement | null>(null);
  const turnRef = useRef<HTMLDivElement | null>(null);
  const flight = useRef<Flight | undefined>(undefined);
  const gesture = useRef<Gesture | undefined>(undefined);
  const cut = `${mode}:${edition}`;
  const [displayedCut, setDisplayedCut] = useState(cut);

  // Re-cutting the issue moves the reader's page to a different number without their having
  // turned anything: a change of mode pairs the leaves up differently, and a re-typesetting
  // gives an article that ran over the pages it needs. Either way nothing turned — the same
  // page is simply somewhere else in the book — so the leaf is moved rather than flown.
  //
  // Adjusted here, during the render, and not in an effect. An effect runs after the browser
  // has painted, so there would be one frame holding a spread number counted against the old
  // cut and read against the new one — which is a different page. On screen nobody sees it,
  // because the corrected frame lands immediately after. A printer does: it lays the page out
  // at paper width, which re-cuts the issue to a single leaf, and photographs that first
  // frame. Printing any review used to hand back a different one.
  if (target !== undefined && phase !== 'drag' && displayedCut !== cut) {
    setDisplayedCut(cut);
    setDisplayed(target);
    setPhase('rest');
    setTurning(undefined);
  }

  // The spread the URL was last seen pointing at. A drag navigates the moment the reader
  // lets go, and that navigation lands one commit after the state that starts the settle —
  // so the effect below runs once with the leaf already flying towards its new spread and
  // the URL still on the old one. Without this, that stale reading is indistinguishable
  // from the reader asking for a different page mid-turn.
  const seenTarget = useRef(target);

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
  const modeAt = useRef(mode);
  modeAt.current = mode;

  // Held in a ref so the window listeners below can be attached once and never re-bound.
  const turned = useRef(onTurn);
  useLayoutEffect(() => {
    turned.current = onTurn;
  });

  // The leaf the re-cut above took out of the air. Before the paint, so the cancelled turn
  // is never a frame of its own; the landing is already guarded by the layout effect's
  // cleanup, so this is only making sure nothing is left running on a detached node.
  //
  // Keyed on the cut the book is *showing*, not the one it was handed, so it fires only when
  // the re-cut above has actually put the book down. The cut can change without that: while
  // the issue is being counted again the URL may name a page the provisional cut does not
  // have yet, and a turn cancelled then was left in the air for good — `animate`, with
  // nothing running to ever land it. If the count comes back the same, the turn carries on.
  useLayoutEffect(() => {
    ground(flight.current);
  }, [displayedCut]);

  // Deps are all primitives or state objects. A dep on anything derived — a spread, a
  // plan — would be a fresh object on every render once the compiler is not memoising,
  // which is the case in the browser tests: the magazine would turn pages forever.
  useEffect(() => {
    if (target === undefined || phase === 'drag') return;

    const moved = target !== seenTarget.current;
    seenTarget.current = target;

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
    // turning and start the next from where it came down. Only a URL that has actually
    // moved is the reader asking — this effect also runs whenever the turn's own state
    // changes, and acting on those would restart the settle a released drag had already
    // begun, from nothing.
    if (moved && turning && target !== turning.to) {
      ground(flight.current);
      setDisplayed(turning.to);
      setTurning({
        from: turning.to,
        to: target,
        direction: directionOf(turning.to, target),
        settle: 'to',
        progress: 0,
      });
    }
  }, [target, displayed, phase, cut, turning]);

  // A layout effect, so the leaf's first painted frame is the one it was already at —
  // which for a fresh turn is 0 degrees, arranged to be indistinguishable from the spread
  // being left, and for a released drag is wherever the reader let go.
  useLayoutEffect(() => {
    if (phase !== 'animate' || !turning) return;

    const node = turnRef.current;
    if (!node) return;

    ground(flight.current);

    const landed = turning.settle === 'to';
    const from = turning.progress;
    const to = landed ? 1 : 0;
    const eye = eyeOf(mode, turning.direction);
    const paper = paperOf(node);
    const poseAt = (share: number) =>
      draw(paper, stripsOf(curlPose(from + (to - from) * share), turning.direction, eye));

    // One clock for the whole leaf, and the whole pose drawn from it every frame, the way a
    // drag draws it. The strips are separate layers, and separate animations are not kept in
    // step: given one each, Firefox's compositor let neighbours drift a frame apart and the
    // leaf split open between them mid-turn. The clock is an animation of nothing — timing
    // only — so it still gives a reliable `finished`, still resolves at `duration: 0` (which
    // is how reduced motion lands the leaf at once rather than stranding the turn), still
    // eases, and `cancel()` still interrupts it.
    const clock = new Animation(
      new KeyframeEffect(null, null, {
        duration: turnDuration(prefersReducedMotion(), remainingTravel(from, turning.settle)),
        easing: turnEasing(from),
        fill: 'forwards',
      }),
      document.timeline,
    );
    const flying: Flight = { clock, frame: 0 };
    flight.current = flying;

    // Drawn now, before the paint, so the first frame is the one the leaf was already at.
    poseAt(0);
    const tick = () => {
      poseAt(clock.effect?.getComputedTiming().progress ?? 0);
      flying.frame = requestAnimationFrame(tick);
    };
    flying.frame = requestAnimationFrame(tick);
    clock.play();

    let interrupted = false;
    clock.finished
      .then(() => {
        cancelAnimationFrame(flying.frame);
        if (interrupted) return;

        // Laid down exactly, before React commits the landed spread under it, so the paper
        // never snaps back for a frame on its way to arriving.
        poseAt(1);
        setDisplayed(landed ? turning.to : turning.from);
        setPhase('rest');
        setTurning(undefined);
      })
      // cancel() rejects, which is how an interrupted turn reports itself.
      .catch(() => {});

    return () => {
      interrupted = true;
      cancelAnimationFrame(flying.frame);
    };
  }, [mode, phase, turning]);

  // Bound once, reading the gesture out of a ref, so the listener set never churns and a
  // drag never re-renders the pages under it: the pose is written straight to the paper.
  useEffect(() => {
    function poseTo(progress: number, direction: Direction) {
      const leaf = turnRef.current;
      if (!leaf) return;

      const eye = eyeOf(modeAt.current, direction);
      draw(paperOf(leaf), stripsOf(curlPose(progress), direction, eye));
    }

    function onMove(event: PointerEvent) {
      const held = gesture.current;
      if (!held || event.pointerId !== held.pointerId) return;

      if (held.direction === undefined) {
        resolve(held, event);
        return;
      }

      const progress = dragProgress(held.direction, event.clientX - held.startX, held.leafWidth);

      held.progress = progress;
      held.samples = trail(held.samples, { progress, time: event.timeStamp });
      poseTo(progress, held.direction);
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
      held.samples = [{ progress: 0, time: event.timeStamp }];
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
        event.type === 'pointercancel'
          ? 'from'
          : settleTarget(held.progress, flickVelocity(held.samples));

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
    return () => ground(flight.current);
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
      samples: [{ progress: 0, time: event.timeStamp }],
    };

    setTurning({ from: displayed, to, direction, settle: 'from', progress: 0 });
    setPhase('drag');
  }

  // The reader has taken the gesture for something else — a second finger arriving to pinch,
  // or a drag on a page they are looking at closely. Whatever was in the air comes down
  // where it started, which is the same thing a `pointercancel` does; a gesture that had not
  // yet chosen a direction was never a page turn and is simply dropped.
  function abort() {
    const held = gesture.current;
    if (!held) return;

    gesture.current = undefined;
    if (held.direction === undefined) return;

    setTurning({
      from: displayedAt.current,
      to: held.to,
      direction: held.direction,
      settle: 'from',
      progress: held.progress,
    });
    setPhase('animate');
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
      samples: [{ progress: 0, time: event.timeStamp }],
    };
  }

  return { abort, displayed, phase, turning, bookRef, turnRef, grab, swipe };
}
