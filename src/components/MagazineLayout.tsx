import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { MAGAZINE_TITLE } from '../magazine';
import { findPageIndex, pages } from '../pages';
import PageNav from './PageNav';

const EDITABLE = /^(?:INPUT|TEXTAREA|SELECT)$/;

export default function MagazineLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const index = findPageIndex(pages, pathname);
  const previous = index > 0 ? pages[index - 1] : undefined;
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined;

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

  return (
    <div className="flex min-h-svh items-center justify-center bg-desk p-(--sheet-gutter) print:block print:p-0">
      {/* `@container` makes the sheet — not the viewport — the ruler for the type, so a
          page scaled down to a phone keeps the proportions it has at full A4. */}
      <div className="a4-sheet @container flex flex-col overflow-hidden border border-rule bg-paper font-sans text-muted shadow-lg print:border-0 print:shadow-none">
        {/* The cover is its own masthead, so the running head starts on page two. */}
        {index > 0 && (
          <header className="border-b border-rule py-3 text-center text-xs tracking-[0.3em] text-muted uppercase">
            {MAGAZINE_TITLE}
          </header>
        )}

        {/* min-h-0 lets this shrink below its content, which is what moves the overflow
            of a long review inside the sheet instead of stretching the paper. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Outlet />
        </div>

        {index >= 0 && (
          <PageNav current={index + 1} next={next} previous={previous} total={pages.length} />
        )}
      </div>
    </div>
  );
}
