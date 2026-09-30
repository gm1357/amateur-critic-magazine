import { ISSUE } from '../magazine';

// Block flow, not flex: like a review, this is poured into the page's columns and has to be
// able to break between them. The heading is kept whole and the body is left free to run
// over, set the way a review's body is so the issue reads as one hand.
export default function Introduction() {
  return (
    <article className="text-[length:var(--page-type)]">
      <header className="mx-auto max-w-[62ch] break-inside-avoid border-b border-rule pb-[3cqw]">
        <p className="text-[0.7em] tracking-[0.24em] text-accent uppercase">{ISSUE}</p>
        <h1 className="mt-[2.5cqw] font-heading text-[6cqw] tracking-tight text-ink">
          Introduction
        </h1>
      </header>

      {/* Placeholder copy. */}
      <div className="mx-auto mt-[4cqw] max-w-[62ch] space-y-[2cqw] font-heading leading-relaxed text-pretty hyphens-auto text-ink">
        <p className="drop-cap">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </p>
        <p>
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
          anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
          veritatis et quasi architecto beatae vitae dicta sunt explicabo.
        </p>
        <p>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
          consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam
          est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non
          numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
        </p>
      </div>
    </article>
  );
}
