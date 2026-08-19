import { findPageNumber, type Page } from './pages';

// How many leaves the desk has room for. A spread of two facing A4 pages on a phone
// would put each page at under 200px wide, so below the breakpoint the issue is read one
// leaf at a time.
export type Mode = 'single' | 'spread';

export type Direction = 'forward' | 'backward';

export type Spread = {
  left: Page | undefined;
  right: Page | undefined;
};

function pageAt(list: Page[], index: number): Page | undefined {
  return index >= 0 && index < list.length ? list[index] : undefined;
}

// Leaf L carries pages[2L] on its front and pages[2L+1] on its back, so spread s is the
// back of leaf s-1 facing the front of leaf s. That is the whole model, and it is why the
// cover — being page one, the front of the first leaf — sits alone on the right.
//
// Page i is on leaf ⌊i/2⌋: the right of spread i/2 when even, the left of spread (i+1)/2
// when odd. Both collapse to ⌈i/2⌉.
export function spreadOf(mode: Mode, pageIndex: number): number {
  return mode === 'single' ? pageIndex : Math.ceil(pageIndex / 2);
}

// Counted from the last page rather than from a leaf count: an odd page count would
// otherwise be given a phantom spread with nothing on either side of it.
export function spreadCount(mode: Mode, list: Page[]): number {
  return list.length === 0 ? 0 : spreadOf(mode, list.length - 1) + 1;
}

export function spreadAt(mode: Mode, list: Page[], spread: number): Spread {
  if (mode === 'single') return { left: undefined, right: pageAt(list, spread) };

  // Both misses are real pages of the book: index -1 on spread zero is the cover having
  // nothing to face, and running off the end is the blank recto an even page count leaves
  // at the back of the last leaf.
  return { left: pageAt(list, spread * 2 - 1), right: pageAt(list, spread * 2) };
}

// The URL a spread is addressed by. This has to be a right inverse of spreadOf — that is,
// the anchor of spread s must map back to s — or a page turn lands on a URL belonging to
// a different spread and the magazine immediately turns again to correct itself.
export function anchorOf(mode: Mode, list: Page[], spread: number): Page | undefined {
  const { left, right } = spreadAt(mode, list, spread);
  return left ?? right;
}

// The folio the pager prints. Two facing pages are one turn of one leaf, so they are
// reported as the range they are.
export function spreadFolio(list: Page[], spread: Spread): string {
  const left = spread.left && findPageNumber(list, spread.left.path);
  const right = spread.right && findPageNumber(list, spread.right.path);

  if (left && right) return `${left}–${right}`;
  return String(left ?? right ?? 0);
}

export type Turn = {
  direction: Direction;
  staticLeft: Page | undefined;
  staticRight: Page | undefined;
  front: Page | undefined;
  back: Page | undefined;
};

// One leaf lifts off the spread you are leaving and lands on the one you are going to.
// The arrangement is fixed by a single property: at 0deg the four slots reproduce `from`
// exactly, and at 180deg they reproduce `to` exactly. Everything else falls out of that —
// the cover opening onto nothing, the book closing, the blank recto at the back, and a
// contents link that skips several spreads rendering as one thick turn.
export function planTurn(from: Spread, to: Spread, direction: Direction): Turn {
  return direction === 'forward'
    ? {
        direction,
        staticLeft: from.left,
        staticRight: to.right,
        front: from.right,
        back: to.left,
      }
    : {
        direction,
        staticLeft: to.left,
        staticRight: from.right,
        front: from.left,
        back: to.right,
      };
}
