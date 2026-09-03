import { expect, test } from 'vitest';
import { parseReview } from '../../src/data/review';

const valid = {
  movie: 'Heat',
  score: 9,
  date: '2026-01-14',
  review: 'First paragraph.\n\nSecond paragraph.',
};

test('parses a valid review and renames review to text', () => {
  expect(parseReview(valid, 'heat.json', 'heat')).toEqual({
    slug: 'heat',
    movie: 'Heat',
    score: 9,
    date: '2026-01-14',
    hearted: false,
    text: 'First paragraph.\n\nSecond paragraph.',
  });
});

// The marker it comes from is present or absent, so a file that never mentions it is a
// review that was not hearted — not a malformed one.
test('an absent hearted is not an error, it is false', () => {
  expect(parseReview(valid, 'heat.json', 'heat').hearted).toBe(false);
  expect(parseReview({ ...valid, hearted: true }, 'heat.json', 'heat').hearted).toBe(true);
});

test('a non-boolean hearted names both the file and the field', () => {
  const data = { ...valid, hearted: 'yes' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/heat\.json/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"hearted"/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/boolean/);
});

test('a missing movie names both the file and the field', () => {
  const data = { score: 9, date: '2026-01-14', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/heat\.json/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"movie"/);
});

test('a non-numeric score reports the type it got', () => {
  const data = { movie: 'Heat', score: '9', date: '2026-01-14', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"score"/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/string/);
});

test('a score outside 1-10 is rejected at both ends', () => {
  const tooHigh = { movie: 'Heat', score: 42, date: '2026-01-14', review: 'Body.' };
  const tooLow = { movie: 'Heat', score: 0, date: '2026-01-14', review: 'Body.' };

  expect(() => parseReview(tooHigh, 'heat.json', 'heat')).toThrow(/between 1 and 10/);
  expect(() => parseReview(tooLow, 'heat.json', 'heat')).toThrow(/between 1 and 10/);
});

test('a fractional score is rejected', () => {
  const data = { movie: 'Heat', score: 8.5, date: '2026-01-14', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/whole number/);
});

test('an empty review body is rejected', () => {
  const data = { movie: 'Heat', score: 9, date: '2026-01-14', review: '   ' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"review"/);
});

test('a missing date is rejected', () => {
  const data = { movie: 'Heat', score: 9, review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/ISO date/);
});

test('a human-readable date is rejected', () => {
  const data = { movie: 'Heat', score: 9, date: '22 March 2026', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/ISO date/);
});

test('an ISO-shaped date that is not a real day is rejected', () => {
  const data = { movie: 'Heat', score: 9, date: '2026-02-31', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/not a real calendar date/);
});

test('non-objects are rejected', () => {
  expect(() => parseReview(null, 'heat.json', 'heat')).toThrow(/JSON object/);
  expect(() => parseReview([], 'heat.json', 'heat')).toThrow(/JSON object/);
});
