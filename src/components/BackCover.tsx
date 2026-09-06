import type { Review } from '../data/review';
import { reviews, topReviews } from '../data/reviews';
import { AUTHOR, ISSUE, MAGAZINE_TITLE, STRAPLINE } from '../magazine';
import Barcode from './Barcode';
import ScoreBadge from './ScoreBadge';

// As many as fit the block without turning the back of the magazine into a second
// contents page.
const HIGHLIGHTS = 3;

// The imprint dates the issue out of the issue itself — first review to last — rather
// than out of a constant somebody has to remember to change. It is also what the barcode
// prints under itself, which is the one place on a back cover where a row of digits is
// the point.
function spanOf(list: Review[]): { digits: string; year: string } | undefined {
  const opened = list.at(0)?.date;
  const closed = list.at(-1)?.date;
  if (!opened || !closed) return undefined;

  return {
    digits: `${opened.replaceAll('-', '')} ${closed.replaceAll('-', '')}`,
    year: closed.slice(0, 4),
  };
}

// The outside of the back of the magazine, so it is laid out as one: the masthead and its
// strapline at the head, a teaser for what is inside, and the imprint along the foot with
// the barcode in the corner. Nothing here links anywhere — this is the printed side, and
// the contents is where the issue is navigated from.
export default function BackCover() {
  const span = spanOf(reviews);
  const highlights = topReviews(HIGHLIGHTS);

  const rest = reviews.length - highlights.length;

  return (
    <section className="flex flex-1 flex-col px-[9%] py-[7%] text-[clamp(0.8125rem,2cqw,1rem)]">
      <header className="flex flex-col gap-[5%]">
        <h1 className="text-[0.72em] tracking-[0.3em] text-muted uppercase">{MAGAZINE_TITLE}</h1>
        <p className="border-t border-rule pt-[7%] font-heading text-[clamp(1.5rem,8.6cqw,4.25rem)] leading-[1.05] tracking-[-0.02em] text-pretty text-ink">
          {STRAPLINE}
        </p>
      </header>

      {/* The page is weighted to its ends — the strapline at the head, the teaser and the
          imprint together at the foot — so the paper's slack gathers in one place rather
          than opening a gap between every pair of blocks. That is the shape of a back
          cover: a line to read across the room, and the small print along the bottom. */}
      <div className="mt-auto flex flex-col gap-[7%] pt-[10%]">
        {highlights.length > 0 && (
          <div className="flex flex-col gap-[3%] bg-desk px-[6%] py-[5%]">
            <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">
              Inside this issue
            </p>

            <ol className="flex flex-col">
              {highlights.map((review) => (
                // The rules are drawn in muted rather than in rule: this block sits on
                // the desk tint, where a rule-coloured hairline is the same value as its
                // own ground and disappears.
                <li
                  className="flex items-baseline gap-[1.5cqw] border-b border-muted/25 py-[2.6%] last:border-b-0"
                  key={review.slug}
                >
                  <h2 className="font-heading text-[1.15em] text-ink">{review.movie}</h2>
                  {/* The same drawn leader the contents uses, so the two listings of the
                      issue are recognisably the same magazine. */}
                  <span
                    aria-hidden="true"
                    className="min-w-[3cqw] flex-1 translate-y-[-0.25em] border-b border-dotted border-muted/45"
                  />
                  <ScoreBadge score={review.score} />
                </li>
              ))}
            </ol>

            {rest > 0 && (
              <p className="text-[0.75em] text-muted">
                …and {rest} more {rest === 1 ? 'review' : 'reviews'} inside
              </p>
            )}
          </div>
        )}

        <footer className="flex items-end justify-between gap-[8%] border-t border-rule pt-[5%]">
          <div className="w-[44%]">
            <Barcode caption={span?.digits} />
          </div>

          <div className="flex flex-col items-end gap-[0.4em] text-right">
            <p className="font-heading text-[1.15em] text-ink">Free</p>
            <p className="text-[0.68em] tracking-[0.24em] text-muted uppercase">{ISSUE}</p>
            <p className="text-[0.68em] tracking-[0.06em] text-muted">
              {span ? `© ${span.year} ${AUTHOR}` : `© ${AUTHOR}`}
            </p>
          </div>
        </footer>
      </div>
    </section>
  );
}
