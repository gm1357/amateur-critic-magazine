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
    <div className="mx-auto flex min-h-svh w-[1126px] max-w-full flex-col border-x border-rule bg-paper font-sans text-muted">
      {/* The cover is its own masthead, so the running head starts on page two. */}
      {index > 0 && (
        <header className="border-b border-rule py-3 text-center text-xs tracking-[0.3em] text-muted uppercase">
          {MAGAZINE_TITLE}
        </header>
      )}

      <Outlet />

      {index >= 0 && (
        <PageNav current={index + 1} next={next} previous={previous} total={pages.length} />
      )}
    </div>
  );
}
