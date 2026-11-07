import { expect, test } from 'vitest';
import { parseReview } from '../../src/data/review';

const valid = {
  movie: 'Heat',
  score: 9,
  watched_date: '2026-01-14',
  published_date: '2026-01-20',
  review: 'First paragraph.\n\nSecond paragraph.',
};

test('parses a valid review and renames review to text', () => {
  expect(parseReview(valid, 'heat.json', 'heat')).toEqual({
    slug: 'heat',
    movie: 'Heat',
    score: 9,
    watchedDate: '2026-01-14',
    publishedDate: '2026-01-20',
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
  const data = {
    score: 9,
    watched_date: '2026-01-14',
    published_date: '2026-01-20',
    review: 'Body.',
  };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/heat\.json/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"movie"/);
});

test('a non-numeric score reports the type it got', () => {
  const data = {
    movie: 'Heat',
    score: '9',
    watched_date: '2026-01-14',
    published_date: '2026-01-20',
    review: 'Body.',
  };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"score"/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/string/);
});

test('a score outside 1-10 is rejected at both ends', () => {
  const tooHigh = {
    movie: 'Heat',
    score: 42,
    watched_date: '2026-01-14',
    published_date: '2026-01-20',
    review: 'Body.',
  };
  const tooLow = {
    movie: 'Heat',
    score: 0,
    watched_date: '2026-01-14',
    published_date: '2026-01-20',
    review: 'Body.',
  };

  expect(() => parseReview(tooHigh, 'heat.json', 'heat')).toThrow(/between 1 and 10/);
  expect(() => parseReview(tooLow, 'heat.json', 'heat')).toThrow(/between 1 and 10/);
});

test('a fractional score is rejected', () => {
  const data = {
    movie: 'Heat',
    score: 8.5,
    watched_date: '2026-01-14',
    published_date: '2026-01-20',
    review: 'Body.',
  };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/whole number/);
});

test('an empty review body is rejected', () => {
  const data = {
    movie: 'Heat',
    score: 9,
    watched_date: '2026-01-14',
    published_date: '2026-01-20',
    review: '   ',
  };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"review"/);
});

test('a missing watched_date is rejected', () => {
  const data = { movie: 'Heat', score: 9, review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/ISO date/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"watched_date"/);
});

// The field was called `date` once. A file still written that way is caught, not read as
// a review that was never watched.
test('the old date field does not stand in for watched_date', () => {
  const data = { movie: 'Heat', score: 9, date: '2026-01-14', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"watched_date"/);
});

test('a human-readable watched_date is rejected', () => {
  const data = { movie: 'Heat', score: 9, watched_date: '22 March 2026', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/ISO date/);
});

test('an ISO-shaped watched_date that is not a real day is rejected', () => {
  const data = { movie: 'Heat', score: 9, watched_date: '2026-02-31', review: 'Body.' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/not a real calendar date/);
});

test('non-objects are rejected', () => {
  expect(() => parseReview(null, 'heat.json', 'heat')).toThrow(/JSON object/);
  expect(() => parseReview([], 'heat.json', 'heat')).toThrow(/JSON object/);
});

test('a year is optional', () => {
  expect(parseReview(valid, 'heat.json', 'heat').year).toBeUndefined();
  expect(parseReview({ ...valid, year: 1995 }, 'heat.json', 'heat').year).toBe(1995);
});

test('a year that is not a whole number names both the file and the field', () => {
  for (const year of ['1995', 1995.5]) {
    const data = { ...valid, year };

    expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/heat\.json/);
    expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"year"/);
  }
});

test('a year from before cinema is rejected', () => {
  expect(() => parseReview({ ...valid, year: 95 }, 'heat.json', 'heat')).toThrow(/"year"/);
});

test('a missing published_date is rejected', () => {
  const { published_date: _, ...data } = valid;

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"published_date"/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/ISO date/);
});

test('an ISO-shaped published_date that is not a real day is rejected', () => {
  const data = { ...valid, published_date: '2026-02-31' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/"published_date"/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/not a real calendar date/);
});

test('a review may be published on the day it was watched', () => {
  const data = { ...valid, published_date: '2026-01-14' };

  expect(parseReview(data, 'heat.json', 'heat').publishedDate).toBe('2026-01-14');
});

test('a review published before its film was watched is rejected', () => {
  const data = { ...valid, published_date: '2026-01-13' };

  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/heat\.json/);
  expect(() => parseReview(data, 'heat.json', 'heat')).toThrow(/before "watched_date"/);
});
