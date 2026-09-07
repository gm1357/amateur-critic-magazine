// The block in the corner of a back cover. It is drawn rather than encoded: the shape the
// eye expects down there, not a scannable product code — so the pattern is fixed instead
// of generated, and the whole thing is hidden from the role engine.
//
// Bar and space widths, alternating, starting on a bar.
const PATTERN = [
  3, 1, 1, 2, 1, 3, 1, 3, 2, 1, 1, 3, 3, 1, 1, 2, 1, 3, 3, 1, 1, 2, 1, 3, 1, 3, 2, 1, 3, 1,
];

function barsOf(pattern: number[]): { x: number; width: number }[] {
  const bars: { x: number; width: number }[] = [];
  let x = 0;

  for (const [index, width] of pattern.entries()) {
    if (index % 2 === 0) bars.push({ x, width });
    x += width;
  }

  return bars;
}

const BARS = barsOf(PATTERN);
const SPAN = PATTERN.reduce((total, width) => total + width, 0);

// SVG rather than a row of coloured boxes: a printer drops background colours and would
// hand back a blank corner, where a filled rect is content and prints. It is also the
// reason the bars stretch — `preserveAspectRatio: none` lets the block be sized by the
// page it sits on rather than by how many bars the pattern happens to have.
export default function Barcode({ caption }: { caption?: string }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-[0.55em]">
      <svg
        className="h-[3.2em] w-full text-ink"
        preserveAspectRatio="none"
        viewBox={`0 0 ${SPAN} 100`}
      >
        {BARS.map((bar) => (
          <rect fill="currentColor" height="100" key={bar.x} width={bar.width} x={bar.x} y="0" />
        ))}
      </svg>

      {caption && (
        <p className="text-[0.6em] tracking-[0.3em] tabular-nums text-muted">{caption}</p>
      )}
    </div>
  );
}
