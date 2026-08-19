import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { findPageIndex, pages } from '../pages';
import { anchorOf, planTurn, spreadAt, spreadFolio, spreadOf } from '../spread';
import { useFlip } from '../useFlip';
import { useMode } from '../useMode';
import { LEAF } from './Leaf';
import NotFound from './NotFound';
import PageNav from './PageNav';
import Spread from './Spread';
import TurnLayer from './TurnLayer';

const EDITABLE = /^(?:INPUT|TEXTAREA|SELECT)$/;

const DESK =
  'magazine-desk flex min-h-svh flex-col items-center justify-center overflow-x-clip bg-desk p-(--sheet-gutter) print:block print:p-0';

export default function Magazine() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = useMode();

  const index = findPageIndex(pages, pathname);
  const { displayed, phase, turning, turnRef } = useFlip(mode, index);

  // Paging steps by leaf, not by page: two facing pages are one turn, so on a wide desk
  // Next moves past both of them. Reading one leaf at a time, a leaf is a page and this is
  // the same step it has always been.
  const spread = spreadOf(mode, index);
  const previous = index < 0 ? undefined : anchorOf(mode, pages, spread - 1);
  const next = index < 0 ? undefined : anchorOf(mode, pages, spread + 1);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || EDITABLE.test(target?.tagName ?? '')) return;

      if (event.key === 'ArrowRight' && next) navigate(next.path);
      else if (event.key === 'ArrowLeft' && previous) navigate(previous.path);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, next, previous]);

  // A pathname the page list does not recognise was never printed. That -1 is the one
  // signal for "not a page of this issue", and it takes the chrome away with it.
  if (index < 0) {
    return (
      <div className={DESK} data-mode={mode}>
        <div className="magazine-book">
          <div className={LEAF}>
            <NotFound />
          </div>
        </div>
      </div>
    );
  }

  // The halves on the desk are the ones the turning leaf is not covering; at rest they
  // are simply the spread.
  const resting = spreadAt(mode, pages, displayed);
  const turn = turning
    ? planTurn(resting, spreadAt(mode, pages, turning.to), turning.direction)
    : undefined;

  return (
    <div className={DESK} data-mode={mode}>
      <Spread
        index={displayed}
        left={turn ? turn.staticLeft : resting.left}
        mode={mode}
        phase={phase}
        right={turn ? turn.staticRight : resting.right}
      >
        {turn && <TurnLayer ref={turnRef} turn={turn} />}
      </Spread>

      <PageNav
        folio={spreadFolio(pages, spreadAt(mode, pages, spread))}
        next={next}
        previous={previous}
        total={pages.length}
      />
    </div>
  );
}
