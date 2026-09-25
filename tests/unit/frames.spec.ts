import { expect, test } from 'vitest';
import { frameOf, indexFrames } from '../../src/data/frames';
import { reviews } from '../../src/data/reviews';

test('a frame is found by the slug its filename carries, whatever the format', () => {
  const frames = indexFrames(
    {
      './frames/clue.jpg': '/assets/clue-abc.jpg',
      './frames/the-invite.webp': '/assets/the-invite-def.webp',
    },
    ['clue', 'the-invite', 'trap'],
  );

  expect(frames.get('clue')).toBe('/assets/clue-abc.jpg');
  expect(frames.get('the-invite')).toBe('/assets/the-invite-def.webp');
  expect(frames.has('trap')).toBe(false);
});

// A typo in a filename would otherwise just never be printed, and nobody would notice.
test('a frame that matches no review is refused, naming the file', () => {
  expect(() => indexFrames({ './frames/clu.jpg': '/clu.jpg' }, ['clue'])).toThrow(
    /Invalid frame "clu\.jpg": no review has the slug "clu"/,
  );
});

// Which of the two would win is glob order, which is not stable across platforms.
test('two frames for one review are refused', () => {
  expect(() =>
    indexFrames({ './frames/clue.jpg': '/clue.jpg', './frames/clue.webp': '/clue.webp' }, ['clue']),
  ).toThrow(/review "clue" already has a frame/);
});

// Importing the module evaluates the glob over the committed frames, which is what turns a
// stray file into a failing run rather than a still that is silently never printed.
test('every committed frame belongs to a review, and a review without one has none', () => {
  const framed = reviews.filter((review) => frameOf(review.slug));

  expect(framed.length).toBeGreaterThan(0);
  expect(frameOf('not-a-real-movie')).toBeUndefined();
});
