import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { IssueProvider } from '../issue';
import { articles, findPageIndex, nearestPage } from '../pages';
import { anchorOf, planTurn, spreadAt, spreadCount, spreadFolio, spreadOf } from '../spread';
import { useFlip } from '../useFlip';
import { useMode } from '../useMode';
import { useTypeset } from '../useTypeset';
import { useZoom } from '../useZoom';
import ComposingRoom from './ComposingRoom';
import { LEAF } from './Leaf';
import NotFound from './NotFound';
import PageNav from './PageNav';
import Spread from './Spread';
import TurnZone from './TurnZone';
import TurnLayer from './TurnLayer';
import ZoomControls from './ZoomControls';

const EDITABLE = /^(?:INPUT|TEXTAREA|SELECT)$/;

// Clipped on both axes. A leaf in the air projects well past the book under perspective,
// and nothing on the desk is ever meant to scroll the page: overflow reaching the document
// grew it a scrollbar mid-turn, which narrowed the desk and typeset the issue again.
const DESK =
  'magazine-desk flex min-h-svh flex-col items-center justify-center overflow-clip desk-wood p-(--sheet-gutter) print:block print:p-0';

export default function Magazine() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = useMode();

  // The issue counts its own pages, so the model is state rather than a constant: an
  // article that needs two leaves renumbers everything printed after it.
  const desk = useRef<HTMLDivElement>(null);
  const { pages, measured, settled, edition } = useTypeset(articles, desk);

  const index = findPageIndex(pages, pathname);
  const spreads = spreadCount(mode, pages);

  const { abort, bookRef, displayed, grab, phase, swipe, turnRef, turning } = useFlip(
    mode,
    index,
    spreads,
    // A leaf let go of is already decided, so the URL moves with the reader's hand rather
    // than waiting for the paper to come down.
    (spread) => {
      const anchor = anchorOf(mode, pages, spread);
      if (anchor) navigate(anchor.path);
    },
    edition,
  );

  // Looking closer is a view laid over the page, not a change to it: the transform never
  // reaches what a leaf measures, so the issue cannot re-typeset itself by being looked at.
  const zoom = useZoom(abort);

  // A magnified page is read by dragging it about, so it is not also turned by dragging —
  // turning stays on the pager, the arrow keys and the contents. The zoom always gets the
  // press, though: a pinch and a double tap have to be offered from the whole page too, and
  // when either of them takes the gesture it stands the half-opened turn down itself.
  function onPress(event: React.PointerEvent<HTMLElement>) {
    if (!zoom.zoomed) swipe(event);
    zoom.press(event);
  }

  // The reader is still reading at the same magnification, and a new page starts at its
  // head. Keyed on the landed spread rather than the pathname, so the paper is not pulled
  // out from under a turn that is still in the air.
  useEffect(() => {
    zoom.viewportRef.current?.scrollTo(0, 0);
  }, [displayed, edition, mode, zoom.viewportRef]);

  // Re-typesetting can shorten an article, and a reader standing on its last page would be
  // left holding a URL the issue no longer prints. That is not a missing page, it is the
  // same page under a new number.
  //
  // Only once the issue has been counted, though: before that every article is one leaf
  // long, and every continued page in the magazine looks like a page that does not exist.
  const stranded = settled && index < 0 ? nearestPage(pages, pathname)?.path : undefined;
  useEffect(() => {
    if (stranded) navigate(stranded, { replace: true });
  }, [navigate, stranded]);

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

  // The halves on the desk are the ones the turning leaf is not covering; at rest they
  // are simply the spread.
  const resting = spreadAt(mode, pages, displayed);
  const turn = turning
    ? planTurn(resting, spreadAt(mode, pages, turning.to), turning.direction)
    : undefined;

  return (
    <IssueProvider value={pages}>
      <div className={DESK} data-mode={mode} data-zoom={zoom.zoomed ? 'in' : 'fit'} ref={desk}>
        {/* A pathname the page list does not recognise was never printed. That -1 is the
            one signal for "not a page of this issue", and it takes the chrome with it. */}
        {index < 0 ? (
          <div className="magazine-book">
            <div className={LEAF}>
              <NotFound />
            </div>
          </div>
        ) : (
          <>
            {/* The window the book is looked at through, and the paper inside it that the
                magnification scales. Both are inert at fit. */}
            <div className="magazine-viewport" ref={zoom.viewportRef}>
              <div
                className="magazine-zoom"
                style={{ '--zoom': zoom.scale } as React.CSSProperties}
              >
                <Spread
                  index={displayed}
                  ref={bookRef}
                  left={turn ? turn.staticLeft : resting.left}
                  mode={mode}
                  onSwipe={onPress}
                  phase={phase}
                  right={turn ? turn.staticRight : resting.right}
                >
                  {turn && <TurnLayer ref={turnRef} turn={turn} />}

                  {/* Only an edge with a page behind it can be taken hold of — and only
                      while the whole page is on the desk to take hold of. */}
                  {!zoom.zoomed && displayed > 0 && <TurnZone direction="backward" onGrab={grab} />}
                  {!zoom.zoomed && displayed < spreads - 1 && (
                    <TurnZone direction="forward" onGrab={grab} />
                  )}
                </Spread>
              </div>
            </div>

            {/* The desk's chrome band: where you are in the issue, and how closely you are
                looking at it. `--desk-chrome` is the height it is given, and the leaf is
                measured around it. */}
            <div className="magazine-chrome">
              <PageNav
                folio={spreadFolio(pages, spreadAt(mode, pages, spread))}
                next={next}
                previous={previous}
                total={pages.length}
              />

              <ZoomControls onIn={zoom.stepIn} onOut={zoom.stepOut} scale={zoom.scale} />
            </div>
          </>
        )}

        {/* Inside the desk, because the leaves in here are measured against the same
            `--leaf-w` as the ones on it — and only while there is counting to do, so a
            magazine at rest is not carrying a second copy of every article. */}
        {!settled && <ComposingRoom articles={articles} onParts={measured} />}
      </div>
    </IssueProvider>
  );
}
