import type { Direction } from '../spread';

// The strip of page edge you can take hold of. It is decoration as far as assistive tech
// is concerned — the pager is the accessible way to turn a page — and it is where
// `touch-action: none` lives, so a drag that starts here is never mistaken for a scroll.
export default function TurnZone({
  direction,
  onGrab,
}: {
  direction: Direction;
  onGrab: (event: React.PointerEvent<HTMLElement>, direction: Direction) => void;
}) {
  return (
    <div
      aria-hidden="true"
      className="turn-zone"
      data-turn-zone={direction === 'forward' ? 'next' : 'previous'}
      onPointerDown={(event) => onGrab(event, direction)}
    />
  );
}
