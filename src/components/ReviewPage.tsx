import { useParams } from 'react-router';
import { findReview } from '../data/reviews';
import Dateline from './Dateline';
import NotFound from './NotFound';
import ScoreBadge from './ScoreBadge';

export default function ReviewPage() {
  const { slug } = useParams();
  const review = findReview(slug);

  // An unknown slug still matches this route, so the wildcard route never sees it —
  // the 404 has to be rendered from here. The layout hides its chrome on its own,
  // because findPageIndex does not recognise the pathname.
  if (!review) return <NotFound />;

  const paragraphs = review.text.split(/\n{2,}/);

  return (
    <article className="flex flex-1 flex-col items-center px-[9%] py-[6%] text-[clamp(0.8125rem,2cqw,1rem)]">
      <header className="flex w-full max-w-[62ch] flex-col gap-5">
        <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">Review</p>
        <h1 className="font-heading text-[clamp(1.5rem,6cqw,3rem)] tracking-tight text-balance text-ink">
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
