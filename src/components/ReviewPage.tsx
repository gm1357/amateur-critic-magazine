import { useParams } from 'react-router';
import { findReview } from '../data/reviews';
import Dateline from './Dateline';
import ScoreBadge from './ScoreBadge';

export default function ReviewPage() {
  const { slug } = useParams();
  const review = findReview(slug);

  if (!review) return null;

  const paragraphs = review.text.split(/\n{2,}/);

  return (
    <article className="flex flex-1 flex-col items-center px-6 py-16">
      <header className="flex w-full max-w-[62ch] flex-col gap-5">
        <p className="text-[11px] tracking-[0.24em] text-accent uppercase">Review</p>
        <h1 className="font-heading text-5xl tracking-tight text-balance text-ink">
          {review.movie}
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
