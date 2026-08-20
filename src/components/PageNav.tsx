import { Link } from 'react-router';
import type { Page } from '../pages';

const linkClass = 'text-xs tracking-[0.16em] text-muted uppercase';

type PageNavProps = {
  previous: Page | undefined;
  next: Page | undefined;
  folio: string;
  total: number;
};

// The pager sits on the desk rather than on the paper: a control printed on a page would
// turn away with it. It follows the URL, not the paper, so during a drag it reports where
// you are rather than what you can see.
export default function PageNav({ previous, next, folio, total }: PageNavProps) {
  return (
    <nav
      aria-label="Pages"
      className="grid h-(--desk-chrome) w-[calc(var(--leaf-w)*var(--leaves))] grid-cols-3 items-center px-[2%] print:hidden"
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
        {folio} / {total}
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
