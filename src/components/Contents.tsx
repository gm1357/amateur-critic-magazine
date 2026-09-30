import { Link } from 'react-router';
import { reviews } from '../data/reviews';
import { useIssue } from '../issue';
import { ISSUE } from '../magazine';
import { findPageNumber, INTRODUCTION_PATH, reviewPath } from '../pages';
import Dateline from './Dateline';

type EntryProps = {
  // Only a review is dated: the introduction belongs to the issue, not to a day.
  date?: string;
  path: string;
  title: string;
};

function Entry({ date, path, title }: EntryProps) {
  const pages = useIssue();

  return (
    <li className="break-inside-avoid border-b border-rule py-[2.6%] last:border-b-0">
      {/* Only the title is the link, so the entry's accessible name is the title — the
          folio and the leader dots would otherwise be read out as part of it. */}
      <div className="flex items-baseline gap-[1.5cqw]">
        <h2 className="font-heading text-[1.15em] text-ink">
          <Link to={path}>{title}</Link>
        </h2>
        {/* The leader is drawn, not typed: a rule that eats the slack between the title and
            the folio, so it stretches with the sheet at any scale. */}
        <span
          aria-hidden="true"
          className="min-w-[3cqw] flex-1 translate-y-[-0.25em] border-b border-dotted border-rule"
        />
        <span className="text-[0.8125em] tabular-nums text-muted">
          {findPageNumber(pages, path)}
        </span>
      </div>

      {/* The listing dates a review but does not score it — the verdict belongs on the
          review's own page, not in the index. */}
      {date && (
        <div className="mt-[1cqw]">
          <Dateline date={date} />
        </div>
      )}
    </li>
  );
}

// Block flow, not flex: this is poured into the page's columns, and a flex container is
// not something a browser will reliably break across one. Each entry is kept whole for the
// same reason a printer would keep it whole.
export default function Contents() {
  return (
    <section className="text-[length:var(--page-type)]">
      <header className="mb-[4%] break-inside-avoid border-b border-rule pb-[3%]">
        <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">{ISSUE}</p>
        <h1 className="mt-[1.5cqw] font-heading text-[6cqw] tracking-tight text-ink">Contents</h1>
      </header>

      <ol>
        <Entry path={INTRODUCTION_PATH} title="Introduction" />
        {reviews.map((review) => (
          <Entry
            date={review.date}
            key={review.slug}
            path={reviewPath(review.slug)}
            title={review.movie}
          />
        ))}
      </ol>
    </section>
  );
}
