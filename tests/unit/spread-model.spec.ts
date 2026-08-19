import { expect, test } from 'vitest';
import { reviews } from '../../src/data/reviews';
import { buildPages, findPageIndex, type Page, pages } from '../../src/pages';
import {
  anchorOf,
  type Mode,
  planTurn,
  spreadAt,
  spreadCount,
  spreadFolio,
  spreadOf,
} from '../../src/spread';

const MODES: Mode[] = ['single', 'spread'];

// A page list of a given length, so the counting tests do not depend on how many reviews
// happen to be committed.
function issueOf(length: number): Page[] {
  return Array.from({ length }, (_, index) => ({
    path: `/page-${index}`,
    label: `Page ${index}`,
    kind: 'review' as const,
    slug: `page-${index}`,
  }));
}

test('reading one leaf at a time, a spread is a page', () => {
  for (let index = 0; index < pages.length; index++) {
    expect(spreadOf('single', index)).toBe(index);
  }
  expect(spreadCount('single', pages)).toBe(pages.length);
});

test('the cover is alone on the right and the pages pair up behind it', () => {
  expect(pages.map((_, index) => spreadOf('spread', index))).toEqual([0, 1, 1, 2, 2, 3]);

  expect(spreadAt('spread', pages, 0)).toEqual({ left: undefined, right: pages[0] });
  expect(spreadAt('spread', pages, 1)).toEqual({ left: pages[1], right: pages[2] });
  expect(spreadAt('spread', pages, 2)).toEqual({ left: pages[3], right: pages[4] });
});

// An even page count leaves a blank recto at the back of the last leaf; an odd one must
// not be given a spread with nothing on either side of it.
test('the last leaf is blank on one side only when the issue runs out mid-leaf', () => {
  expect(spreadCount('spread', issueOf(6))).toBe(4);
  expect(spreadAt('spread', issueOf(6), 3).right).toBeUndefined();

  expect(spreadCount('spread', issueOf(5))).toBe(3);
  expect(spreadAt('spread', issueOf(5), 2).right).toBeDefined();

  expect(spreadCount('spread', issueOf(1))).toBe(1);
  expect(spreadCount('spread', [])).toBe(0);
});

// If the URL a spread is addressed by belonged to a different spread, turning a page
// would land somewhere the magazine immediately has to turn away from again.
test('every spread is addressed by a URL that maps back to it', () => {
  for (const mode of MODES) {
    for (let spread = 0; spread < spreadCount(mode, pages); spread++) {
      const anchor = anchorOf(mode, pages, spread);

      expect(anchor).toBeDefined();
      expect(spreadOf(mode, findPageIndex(pages, anchor!.path))).toBe(spread);
    }
  }
});

test('there is no spread before the first or after the last', () => {
  for (const mode of MODES) {
    expect(anchorOf(mode, pages, -1)).toBeUndefined();
    expect(anchorOf(mode, pages, spreadCount(mode, pages))).toBeUndefined();
  }
});

test('every page of the issue is on exactly one spread, in exactly one slot', () => {
  for (const mode of MODES) {
    const seen = new Map<string, number>();

    for (let spread = 0; spread < spreadCount(mode, pages); spread++) {
      const { left, right } = spreadAt(mode, pages, spread);
      for (const page of [left, right]) {
        if (page) seen.set(page.path, (seen.get(page.path) ?? 0) + 1);
      }
    }

    expect([...seen.keys()].sort()).toEqual(pages.map((page) => page.path).sort());
    expect([...seen.values()]).toEqual(pages.map(() => 1));
  }
});

test('the pager reports two facing pages as the range they are', () => {
  expect(spreadFolio(pages, spreadAt('spread', pages, 0))).toBe('1');
  expect(spreadFolio(pages, spreadAt('spread', pages, 1))).toBe('2–3');
  expect(spreadFolio(pages, spreadAt('spread', pages, 3))).toBe('6');
  expect(spreadFolio(pages, spreadAt('single', pages, 1))).toBe('2');
});

// The one property the animation rests on: the turn is arranged so that its four slots
// show the spread being left at 0deg, and the spread being joined at 180deg.
test('a turn shows the spread it leaves at rest and the spread it joins turned over', () => {
  for (const mode of MODES) {
    for (let spread = 0; spread + 1 < spreadCount(mode, pages); spread++) {
      const from = spreadAt(mode, pages, spread);
      const to = spreadAt(mode, pages, spread + 1);

      const forward = planTurn(from, to, 'forward');
      expect({ left: forward.staticLeft, right: forward.front }).toEqual(from);
      expect({ left: forward.back, right: forward.staticRight }).toEqual(to);

      const backward = planTurn(to, from, 'backward');
      expect({ left: backward.front, right: backward.staticRight }).toEqual(to);
      expect({ left: backward.staticLeft, right: backward.back }).toEqual(from);
    }
  }
});

test('opening the cover turns onto bare desk, and closing it turns back onto bare desk', () => {
  const cover = spreadAt('spread', pages, 0);
  const first = spreadAt('spread', pages, 1);

  const opening = planTurn(cover, first, 'forward');
  expect(opening.staticLeft).toBeUndefined();
  expect(opening.front).toBe(pages[0]);
  expect(opening.back).toBe(pages[1]);
  expect(opening.staticRight).toBe(pages[2]);

  const closing = planTurn(first, cover, 'backward');
  expect(closing.staticLeft).toBeUndefined();
  expect(closing.front).toBe(pages[1]);
  expect(closing.back).toBe(pages[0]);
  expect(closing.staticRight).toBe(pages[2]);
});

// A contents entry can be several spreads ahead. One leaf still gets it right, because
// the arrangement only ever refers to the two spreads at the ends of the jump.
test('a jump of several spreads is still one leaf turning', () => {
  const from = spreadAt('spread', pages, 1);
  const to = spreadAt('spread', pages, 3);
  const turn = planTurn(from, to, 'forward');

  expect({ left: turn.staticLeft, right: turn.front }).toEqual(from);
  expect({ left: turn.back, right: turn.staticRight }).toEqual(to);
});

test('one leaf at a time, a turn has no facing page and turns onto a blank verso', () => {
  const turn = planTurn(spreadAt('single', pages, 0), spreadAt('single', pages, 1), 'forward');

  expect(turn.staticLeft).toBeUndefined();
  expect(turn.back).toBeUndefined();
  expect(turn.front).toBe(pages[0]);
  expect(turn.staticRight).toBe(pages[1]);
});

test('the model does not care how many reviews are committed', () => {
  const built = buildPages(reviews);

  expect(spreadCount('spread', built)).toBe(Math.ceil((built.length - 1) / 2) + 1);
});
