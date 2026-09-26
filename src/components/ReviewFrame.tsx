import { useLayoutEffect, useRef } from 'react';

// How far down the leaf the masthead's foot is. Offsets, not client rects: they are layout,
// so a leaf magnified by the zoom or tilted in the air measures exactly what it would lying
// flat on the desk. The walk climbs every positioned box between the two, whichever of them
// the engine counts as an offset parent, and gives up if the leaf is not among them.
function footOf(masthead: HTMLElement, leaf: HTMLElement): number | undefined {
  let foot = masthead.offsetTop + masthead.offsetHeight;

  for (let box = masthead.offsetParent; box !== leaf; box = (box as HTMLElement).offsetParent) {
    if (!(box instanceof HTMLElement)) return undefined;
    foot += box.offsetTop + box.clientTop;
  }

  return foot;
}

// The still behind a review's masthead. It is decoration — the masthead in front of it
// already says which film this is — so it is kept out of the accessibility tree.
//
// How deep it runs depends on how the title wraps, which only layout knows, so it is
// measured — once when it is printed and again whenever the masthead or the leaf changes
// size. The depth is kept in `cqw`, a share of the leaf's own width, like every other length
// on the page: a leaf that is scaled up for the printer takes the still with it before
// anything has had the chance to measure again. It is written straight to the node rather
// than held in state, so being measured never re-renders the page under it.
//
// `object-cover` fills the band whatever shape the title leaves it: the photograph is
// cropped rather than stretched, and never leaves paper showing at an edge. The scrim over
// it is what lets the type stay light and readable on any frame. It deepens towards the
// foot, where the score and dateline sit in the smallest type and the photograph meets
// the page — so the still settles into the paper rather than stopping at a hard edge.
export default function ReviewFrame({ src }: { src: string }) {
  const frame = useRef<HTMLDivElement>(null);

  // Keyed on the film, so a leaf that is handed a different review finds its masthead anew.
  useLayoutEffect(() => {
    const node = frame.current;
    const leaf = node?.parentElement;
    const masthead = leaf?.querySelector<HTMLElement>('[data-masthead]');
    if (!node || !leaf || !masthead) return;

    const measure = () => {
      const foot = footOf(masthead, leaf);
      if (foot === undefined || leaf.clientWidth <= 0) return;

      node.style.setProperty('--frame-depth', String((foot / leaf.clientWidth) * 100));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(masthead);
    observer.observe(leaf);
    return () => observer.disconnect();
  }, [src]);

  return (
    <div aria-hidden="true" className="review-frame" data-frame ref={frame}>
      <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" src={src} />
      <div className="absolute inset-0 bg-linear-to-b from-black/45 to-black/80" data-scrim />
    </div>
  );
}
