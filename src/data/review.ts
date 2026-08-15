export type Review = {
  slug: string;
  movie: string;
  score: number;
  date: string;
  text: string;
};

// Whole points only, 1 to 10 — each point renders as half a star, so the scale is
// really "how many half-stars", and a fraction would have nothing to draw.
const SCORE_MIN = 1;
const SCORE_MAX = 10;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function fail(file: string, message: string): never {
  throw new Error(`Invalid review "${file}": ${message}`);
}

function requireText(value: unknown, field: string, file: string): string {
  if (typeof value !== 'string') {
    fail(file, `field "${field}" must be a string, got ${describe(value)}`);
  }
  if (value.trim() === '') fail(file, `field "${field}" must not be empty`);
  return value;
}

function requireScore(value: unknown, file: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(file, `field "score" must be a finite number, got ${describe(value)}`);
  }
  if (!Number.isInteger(value)) {
    fail(file, `field "score" must be a whole number, got ${value}`);
  }
  if (value < SCORE_MIN || value > SCORE_MAX) {
    fail(file, `field "score" must be between ${SCORE_MIN} and ${SCORE_MAX}, got ${value}`);
  }
  return value;
}

function requireDate(value: unknown, file: string): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    fail(file, `field "date" must be an ISO date like "2026-03-22", got ${describe(value)}`);
  }
  // Date-only strings parse as UTC midnight, so toISOString().slice(0, 10) round-trips
  // exactly — which is what catches impossible dates like 2026-02-31 that Date would
  // otherwise silently roll over into the next month.
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(file, `field "date" is not a real calendar date: "${value}"`);
  }
  return value;
}

export function parseReview(data: unknown, file: string, slug: string): Review {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    fail(file, `expected a JSON object, got ${describe(data)}`);
  }

  const raw = data as Record<string, unknown>;

  return {
    slug,
    movie: requireText(raw.movie, 'movie', file),
    score: requireScore(raw.score, file),
    date: requireDate(raw.date, file),
    text: requireText(raw.review, 'review', file),
  };
}
