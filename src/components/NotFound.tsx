import { Link } from 'react-router';

export default function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-[3cqw] px-[10%] py-[8%] text-center text-[length:var(--page-type)]">
      <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">Missing page</p>
      <h1 className="font-heading text-[6cqw] tracking-tight text-balance text-ink">
        This page was never printed
      </h1>
      <p className="max-w-[46ch] font-heading text-pretty">
        There is no review at this address. It may have been a typo, or a link to an issue that does
        not exist.
      </p>
      <Link className="text-[1.5cqw] tracking-[0.16em] text-accent uppercase" to="/">
        Back to the cover
      </Link>
    </section>
  );
}
