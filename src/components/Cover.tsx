import { AUTHOR, ISSUE, MAGAZINE_TITLE } from '../magazine';

export default function Cover() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="text-sm tracking-[0.2em] text-muted uppercase">{ISSUE}</p>
      <h1 className="font-heading text-[clamp(3rem,9vw,7rem)] leading-[0.95] tracking-[-0.03em] text-balance text-ink">
        {MAGAZINE_TITLE}
      </h1>
      <p className="text-sm tracking-[0.2em] text-muted uppercase">by {AUTHOR}</p>
    </section>
  );
}
