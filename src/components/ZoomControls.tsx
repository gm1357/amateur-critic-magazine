import { MAX_SCALE, MIN_SCALE } from '../zoom';

const BUTTON =
  'flex h-[1.6em] w-[1.6em] items-center justify-center text-sm text-on-desk disabled:opacity-25';

type ZoomControlsProps = {
  scale: number;
  onIn: () => void;
  onOut: () => void;
};

// How closely the page is being looked at, and the two ways to change it. It sits beside the
// pager rather than inside it: that nav says where you are in the issue, and this says how
// you are looking at it. Both stand on the desk, so neither turns away with a page.
export default function ZoomControls({ scale, onIn, onOut }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-[0.25em] text-xs" role="group" aria-label="Zoom">
      <button
        aria-label="Zoom out"
        className={BUTTON}
        disabled={scale <= MIN_SCALE}
        onClick={onOut}
        type="button"
      >
        <span aria-hidden="true">−</span>
      </button>

      {/* The magnification, announced as it changes, so it is not a silent control. */}
      <output aria-live="polite" className="w-[3.5em] text-center tabular-nums text-on-desk">
        {Math.round(scale * 100)}%
      </output>

      <button
        aria-label="Zoom in"
        className={BUTTON}
        disabled={scale >= MAX_SCALE}
        onClick={onIn}
        type="button"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
