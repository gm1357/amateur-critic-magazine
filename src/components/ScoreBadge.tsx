type ScoreBadgeProps = {
  score: number;
};

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <p className="inline-flex items-baseline gap-1.5 rounded-full border border-rule px-4 py-1">
      <span className="text-[11px] tracking-[0.18em] text-muted uppercase">Score</span>
      <span className="text-lg tabular-nums text-accent">{score.toFixed(1)}</span>
      <span className="text-xs text-muted">/ 10</span>
    </p>
  );
}
