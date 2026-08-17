// Five stars, one point per half star. Two identical rows of glyphs are stacked and the
// filled one is clipped to score/10 of the width — because both rows are the same string
// in the same font, the clip lands exactly on a glyph or its midpoint, which is what
// makes half stars land true without measuring anything.
const STARS = '★★★★★';

type ScoreBadgeProps = {
  score: number;
};

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <p
      aria-label={`${score} out of 10`}
      className="relative inline-block text-[1.25em] leading-none whitespace-nowrap"
      role="img"
    >
      <span className="text-rule">{STARS}</span>
      <span
        className="absolute inset-y-0 left-0 overflow-hidden text-accent"
        style={{ width: `${score * 10}%` }}
      >
        {STARS}
      </span>
    </p>
  );
}
