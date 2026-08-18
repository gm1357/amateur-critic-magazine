import { Link } from 'react-router';
import { reviews } from '../data/reviews';
import { ISSUE } from '../magazine';
import { findPageNumber, pages, reviewPath } from '../pages';
import Dateline from './Dateline';
import ScoreBadge from './ScoreBadge';

export default function Contents() {
  return (
    <section className="flex flex-1 flex-col px-[9%] py-[6%] text-[clamp(0.8125rem,2cqw,1rem)]">
      <header className="flex flex-col gap-[1.5cqw] border-b border-rule pb-[3%]">
        <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">{ISSUE}</p>
        <h1 className="font-heading text-[clamp(1.5rem,6cqw,3rem)] tracking-tight text-ink">
          Contents
        </h1>
      </header>

      <ol className="mt-[4%] flex flex-col">
        {reviews.map((review) => (
          <li className="border-b border-rule py-[2.6%] last:border-b-0" key={review.slug}>
            {/* Only the title is the link, so the entry's accessible name is the title —
                the folio and the leader dots would otherwise be read out as part of it. */}
            <div className="flex items-baseline gap-[1.5cqw]">
              <h2 className="font-heading text-[1.15em] text-ink">
                <Link to={reviewPath(review.slug)}>{review.movie}</Link>
              </h2>
              {/* The leader is drawn, not typed: a rule that eats the slack between the
                  title and the folio, so it stretches with the sheet at any scale. */}
              <span
                aria-hidden="true"
                className="min-w-[3cqw] flex-1 translate-y-[-0.25em] border-b border-dotted border-rule"
              />
              <span className="text-[0.8125em] tabular-nums text-muted">
                {findPageNumber(pages, reviewPath(review.slug))}
              </span>
            </div>

            <div className="mt-[1cqw] flex flex-wrap items-center gap-[2.5cqw]">
              <ScoreBadge score={review.score} />
              <Dateline date={review.date} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
