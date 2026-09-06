// The issue typesets itself: an article that outruns a leaf is continued onto the next
// one, so how many pages the magazine has is not something a test can import from the
// model. It depends on the size of the desk it was laid out on. These read the magazine's
// own account of itself instead — which is also the thing a reader would go by.
//
// Not a `*.spec.*`, so vitest does not collect it.

function pagerOf(container: HTMLElement): string {
  const pager = container.querySelector('nav[aria-label="Pages"] p');
  if (!pager) throw new Error('the issue is not showing a pager');

  return pager.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

// The folio the pager is printing: "3", or "2–3" for two facing pages.
export function folioOf(container: HTMLElement): string {
  return pagerOf(container).split('/')[0].trim();
}

// How many leaves this issue turned out to have.
export function totalOf(container: HTMLElement): number {
  const total = /\/\s*(\d+)\s*$/.exec(pagerOf(container));
  if (!total) throw new Error(`no total in the pager: "${pagerOf(container)}"`);

  return Number(total[1]);
}

// The pages open on the desk, in the order they are laid out. Scoped to the book, so a
// leaf being measured in the composing room is never mistaken for one on the desk.
export function openAt(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-spread] [data-page]')].map(
    (leaf) => leaf.getAttribute('data-page') ?? '',
  );
}
