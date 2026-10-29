import { AUTHOR, ISSUE, MAGAZINE_TITLE } from '../magazine';
import Monogram from './Monogram';

export default function Cover() {
  // Padding is a percentage of the sheet and type is in cqw, so the cover holds its A4
  // composition whether the page is printed or shrunk onto a phone.
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-[4cqw] px-[10%] py-[8%] text-center">
      {/* A watermark: centred on the paper and out of flow, so the type sits exactly where
          it would without it. Below zero in the leaf's stacking context is above the paper
          and under everything printed on it — the same layer a review's film still takes. */}
      <Monogram className="pointer-events-none absolute inset-0 -z-1 m-auto w-[64cqw] opacity-[0.12]" />
      <p className="text-[1.7cqw] tracking-[0.2em] text-muted uppercase">{ISSUE}</p>
      <h1 className="font-heading text-[11cqw] leading-[0.95] tracking-[-0.03em] text-balance text-ink">
        {MAGAZINE_TITLE}
      </h1>
      <p className="text-[clamp(0.625rem,1.7cqw,0.875rem)] tracking-[0.2em] text-muted uppercase">
        by {AUTHOR}
      </p>
    </section>
  );
}
