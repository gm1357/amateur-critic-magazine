import { AUTHOR, ISSUE, MAGAZINE_TITLE } from '../magazine';
import Monogram from './Monogram';

export default function Cover() {
  // Padding is a percentage of the sheet and type is in cqw, so the cover holds its A4
  // composition whether the page is printed or shrunk onto a phone.
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-[4cqw] px-[10%] py-[8%] text-center">
      <p className="text-[1.7cqw] tracking-[0.2em] text-muted uppercase">{ISSUE}</p>
      <Monogram className="w-[12cqw]" />
      <h1 className="font-heading text-[11cqw] leading-[0.95] tracking-[-0.03em] text-balance text-ink">
        {MAGAZINE_TITLE}
      </h1>
      <p className="text-[clamp(0.625rem,1.7cqw,0.875rem)] tracking-[0.2em] text-muted uppercase">
        by {AUTHOR}
      </p>
    </section>
  );
}
