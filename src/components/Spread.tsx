import type { Mode, Spread as SpreadModel } from '../spread';
import Leaf from './Leaf';

function Blank() {
  return <div aria-hidden="true" className="leaf-blank" />;
}

export default function Spread({
  index,
  mode,
  spread,
}: {
  index: number;
  mode: Mode;
  spread: SpreadModel;
}) {
  return (
    <div className="magazine-book" data-spread={index}>
      {/* One leaf at a time has no facing page at all, so the left half is not a blank
          half of a book — it does not exist. */}
      {mode === 'spread' && (spread.left ? <Leaf page={spread.left} /> : <Blank />)}
      {spread.right ? <Leaf page={spread.right} /> : <Blank />}
    </div>
  );
}
