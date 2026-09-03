import { findReview } from '../data/reviews';
import Dateline from './Dateline';
import NotFound from './NotFound';
import ScoreBadge from './ScoreBadge';
import SealOfApproval from './SealOfApproval';

export default function ReviewPage({ slug }: { slug: string }) {
  const review = findReview(slug);

  // Every review page in the model is built from a review, so this cannot miss — but the
  // link between the two is a slug, which the type system cannot check.
  if (!review) return <NotFound />;

  const paragraphs = review.text.split(/\n{2,}/);

  return (
    <article className="flex flex-1 flex-col items-center px-[9%] py-[6%] text-[clamp(0.8125rem,2cqw,1rem)]">
      <header className="flex w-full max-w-[62ch] flex-col gap-5">
        <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">Review</p>
        {/* The seal is stamped in the corner of the page, so it is pinned to the outer
            margin rather than trailing the title. It stays *inside* the heading all the
            same: it is sized in `em`, and the heading's clamp is the ruler it wants. */}
        <h1 className="flex items-start justify-between gap-[0.5em] font-heading text-[clamp(1.5rem,6cqw,3rem)] tracking-tight text-ink">
          <span className="text-balance">{review.movie}</span>
          {review.hearted && <SealOfApproval />}
        </h1>
        <div className="flex flex-wrap items-center gap-4 border-b border-rule pb-6">
          <ScoreBadge score={review.score} />
          <Dateline date={review.date} />
        </div>
      </header>

      <div className="mt-8 max-w-[62ch] space-y-4 font-heading leading-relaxed text-pretty hyphens-auto text-ink">
        {paragraphs.map((paragraph, index) => (
          <p className="first:drop-cap" key={`${review.slug}-${index}`}>
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
