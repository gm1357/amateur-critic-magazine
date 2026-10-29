import { expect, test } from 'vitest';
import { DEFAULT_DESK, DESKS, parseDesk } from '../../src/desk';

test('every desk the picker offers is read back as itself', () => {
  for (const desk of DESKS) expect(parseDesk(desk.id)).toBe(desk.id);
});

test('a stored value that is not a desk falls back to walnut', () => {
  expect(DEFAULT_DESK).toBe('walnut');

  for (const value of [null, undefined, '', 'mahogany', 3]) {
    expect(parseDesk(value)).toBe(DEFAULT_DESK);
  }
});

test('the picker lists the woods first, then the plain desks', () => {
  expect(DESKS.map((desk) => desk.label)).toEqual(['Walnut', 'Light oak', 'Black', 'Light']);
});
