// A hearted review gets a stamp beside its title. It is drawn rather than set in a glyph
// so it keeps its weight when the leaf scales down: a font would hint the ring away to a
// smudge on a phone, where a stroked circle just gets thinner.
//
// Everything is in `em`, so the seal is sized by the heading it sits in rather than by
// the page — the same reason page type is set in `cqw` and never in `px`.
const STAR =
  'M 12 6.6 L 13.26 10.26 L 17.14 10.33 L 14.04 12.66 L 15.17 16.37 ' +
  'L 12 14.15 L 8.83 16.37 L 9.96 12.66 L 6.86 10.33 L 10.74 10.26 Z';

export default function SealOfApproval() {
  return (
    <span
      aria-label="Seal of approval"
      className="mt-[0.16em] inline-block h-[0.85em] w-[0.85em] shrink-0 text-accent"
      role="img"
    >
      <svg aria-hidden="true" className="h-full w-full" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11.1" stroke="currentColor" strokeWidth="1.4" />
        {/* The milled edge of a struck seal, as a beaded ring: round dashes on a circle
            rather than a scalloped path, so it stays even at any size. */}
        <circle
          cx="12"
          cy="12"
          r="8.6"
          stroke="currentColor"
          strokeDasharray="0.1 2.15"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <path d={STAR} fill="currentColor" />
      </svg>
    </span>
  );
}
