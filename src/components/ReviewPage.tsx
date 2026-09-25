import { frameOf } from '../data/frames';
import { findReview } from '../data/reviews';
import Dateline from './Dateline';
import NotFound from './NotFound';
import ScoreBadge from './ScoreBadge';
import SealOfApproval from './SealOfApproval';

// Block flow, not flex: the review is poured into the page's columns and has to be able to
// break between them. The masthead block is kept whole — a title split from its own score
// would read as two half-articles — and the body is left free to run over.
export default function ReviewPage({ slug }: { slug: string }) {
  const review = findReview(slug);

  // Every review page in the model is built from a review, so this cannot miss — but the
  // link between the two is a slug, which the type system cannot check.
  if (!review) return <NotFound />;

  const paragraphs = review.text.split(/\n{2,}/);

  return (
    <article className="text-[length:var(--page-type)]">
      {/* `masthead` is where a film still printed behind this header stops, and `on-frame`
          sets the type light so it reads over it. The leaf draws the still: this header is
          inside the page's text box and could not reach the paper's edge. */}
      <header
        className={`${frameOf(review.slug) ? 'on-frame ' : ''}masthead mx-auto max-w-[62ch] break-inside-avoid`}
      >
        <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">Review</p>
        {/* The seal is stamped in the corner of the page, so it is pinned to the outer
            margin rather than trailing the title. It stays *inside* the heading all the
            same: it is sized in `em`, and the heading is the ruler it wants. */}
        <h1 className="mt-[2.5cqw] flex items-start justify-between gap-[0.5em] font-heading text-[6cqw] tracking-tight text-ink">
          <span className="text-balance">{review.movie}</span>
          {review.hearted && <SealOfApproval />}
        </h1>
        <div className="mt-[2.5cqw] flex flex-wrap items-center gap-[2cqw] border-b border-rule pb-[3cqw]">
          <ScoreBadge score={review.score} />
          <Dateline date={review.date} />
        </div>
      </header>

      <div className="mx-auto mt-[4cqw] max-w-[62ch] space-y-[2cqw] font-heading leading-relaxed text-pretty hyphens-auto text-ink">
        {paragraphs.map((paragraph, index) => (
          <p className="first:drop-cap" key={`${review.slug}-${index}`}>
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
