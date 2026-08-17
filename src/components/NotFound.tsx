import { Link } from 'react-router';

export default function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 px-[10%] py-[8%] text-center text-[clamp(0.8125rem,2cqw,1rem)]">
      <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">Missing page</p>
      <h1 className="font-heading text-[clamp(1.5rem,6cqw,3rem)] tracking-tight text-balance text-ink">
        This page was never printed
      </h1>
      <p className="max-w-[46ch] font-heading text-pretty">
        There is no review at this address. It may have been a typo, or a link to an issue that does
        not exist.
      </p>
      <Link className="text-xs tracking-[0.16em] text-accent uppercase" to="/">
        Back to the cover
      </Link>
    </section>
  );
}
