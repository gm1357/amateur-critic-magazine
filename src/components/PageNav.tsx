import { Link } from 'react-router';
import type { Page } from '../pages';

const linkClass = 'text-xs tracking-[0.16em] text-muted uppercase';

type PageNavProps = {
  previous: Page | undefined;
  next: Page | undefined;
  current: number;
  total: number;
};

export default function PageNav({ previous, next, current, total }: PageNavProps) {
  return (
    <nav
      aria-label="Pages"
      className="mt-auto grid grid-cols-3 items-center border-t border-rule px-[6%] py-4"
    >
      {previous ? (
        <Link className={`${linkClass} justify-self-start`} rel="prev" to={previous.path}>
          <span aria-hidden="true">←</span> Previous
        </Link>
      ) : (
        // A span rather than a missing node, so the three-up grid never shifts.
        <span aria-hidden="true" className={`${linkClass} justify-self-start opacity-35`}>
          ← Previous
        </span>
      )}

      <p className="text-center text-xs tabular-nums text-muted">
        {current} / {total}
      </p>

      {next ? (
        <Link className={`${linkClass} justify-self-end`} rel="next" to={next.path}>
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={`${linkClass} justify-self-end opacity-35`}>
          Next →
        </span>
      )}
    </nav>
  );
}
