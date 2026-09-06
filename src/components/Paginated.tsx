import { useLayoutEffect, useRef } from 'react';

// How many leaf-wide columns the article fragmented into. The flow is exactly one column
// across, so every column after the first is overflow; the gap is added to both sides of
// the division because it falls *between* columns and not after the last one.
function partsOf(flow: HTMLElement): number {
  const width = flow.clientWidth;
  if (width <= 0) return 1;

  const gap = Number.parseFloat(getComputedStyle(flow).columnGap) || 0;
  return Math.max(1, Math.round((flow.scrollWidth + gap) / (width + gap)));
}

type PaginatedProps = {
  children: React.ReactNode;
  // Given only in the composing room. A page on the desk shows the part it was asked for
  // and reports nothing.
  onParts?: (parts: number) => void;
  part: number;
  // The article is already being read aloud from the page facing this one.
  silent?: boolean;
};

// An article poured into leaf-sized columns. The browser does the fragmenting — the same
// engine that breaks a page for the printer — so a paragraph splits between pages the way
// it would in print, and nothing here has to measure a line or count a word.
export default function Paginated({ children, onParts, part, silent }: PaginatedProps) {
  const flow = useRef<HTMLDivElement>(null);

  // Held in a ref so the observer below is attached once and never re-bound: the callback
  // is a fresh closure on every render, and a dep on it would tear the observer down and
  // build it again — a layout per render, forever.
  const report = useRef(onParts);
  report.current = onParts;

  useLayoutEffect(() => {
    const node = flow.current;
    if (!node) return;

    // An arrow rather than a declaration: a hoisted function does not keep the narrowing
    // the guard above just established, and `node` reads as possibly null inside it.
    const count = () => report.current?.(partsOf(node));

    count();

    // The leaf is sized off the desk, so a desk that changes size re-typesets the issue —
    // a narrower leaf holds less, exactly as a smaller sheet of paper would.
    const observer = new ResizeObserver(count);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-hidden={silent || undefined} className="page-box">
      <div className="page-window">
        <div className="page-flow" ref={flow} style={{ '--part': part } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </div>
  );
}
