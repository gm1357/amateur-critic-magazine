import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { findPageIndex, pages } from '../pages';
import { anchorOf, spreadAt, spreadFolio, spreadOf } from '../spread';
import { useMode } from '../useMode';
import { LEAF } from './Leaf';
import NotFound from './NotFound';
import PageNav from './PageNav';
import Spread from './Spread';

const EDITABLE = /^(?:INPUT|TEXTAREA|SELECT)$/;

const DESK =
  'magazine-desk flex min-h-svh flex-col items-center justify-center overflow-x-clip bg-desk p-(--sheet-gutter) print:block print:p-0';

export default function Magazine() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = useMode();

  const index = findPageIndex(pages, pathname);
  const spread = spreadOf(mode, index);

  // Paging steps by leaf, not by page: two facing pages are one turn, so on a wide desk
  // Next moves past both of them. Reading one leaf at a time, a leaf is a page and this is
  // the same step it has always been.
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

  return (
    <div className={DESK} data-mode={mode}>
      <Spread index={spread} mode={mode} spread={spreadAt(mode, pages, spread)} />
      <PageNav
        folio={spreadFolio(pages, spreadAt(mode, pages, spread))}
        next={next}
        previous={previous}
        total={pages.length}
      />
    </div>
  );
}
