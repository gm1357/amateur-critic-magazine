// What the magazine is lying on. The reader chooses, so this is a preference rather than
// part of the issue: none of it reaches the paper, and none of it is printed.
export const DESKS = [
  { id: 'black', label: 'Black' },
  { id: 'walnut', label: 'Walnut' },
  { id: 'oak', label: 'Light oak' },
  { id: 'light', label: 'Light' },
] as const;

export type Desk = (typeof DESKS)[number]['id'];

export const DEFAULT_DESK: Desk = 'walnut';

// A stored choice is whatever the browser hands back, which may be a desk this issue no
// longer has, or nothing at all. Anything not recognised is the default.
export function parseDesk(value: unknown): Desk {
  return DESKS.find((desk) => desk.id === value)?.id ?? DEFAULT_DESK;
}
