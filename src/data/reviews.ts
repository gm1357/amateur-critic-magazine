import { parseReview, type Review } from './review';

const modules = import.meta.glob<unknown>('./reviews/*.json', {
  eager: true,
  import: 'default',
});

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

// Oldest first, tie-broken by slug. Glob key order is not guaranteed stable across
// platforms, and two reviews sharing a date would otherwise be free to swap page numbers
// between a local run and CI — so every ordering in the issue ends up here.
function byIssueOrder(a: Review, b: Review): number {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : a.slug.localeCompare(b.slug);
}

function loadReviews(): Review[] {
  const loaded = Object.keys(modules).map((path) => {
    const file = fileNameOf(path);
    return parseReview(modules[path], file, file.replace(/\.json$/, ''));
  });

  const seen = new Set<string>();
  for (const review of loaded) {
    if (seen.has(review.slug)) {
      throw new Error(`Invalid review data: duplicate slug "${review.slug}"`);
    }
    seen.add(review.slug);
  }

  // Oldest first, so paging forward moves forward in time. ISO date strings compare
  // correctly as strings.
  loaded.sort(byIssueOrder);

  return loaded;
}

export const reviews: Review[] = loadReviews();

export function findReview(slug: string | undefined): Review | undefined {
  return reviews.find((review) => review.slug === slug);
}

// The back cover teases the issue by verdict rather than by date, so it needs the reviews
// in an order the issue itself never prints them in. Ties fall back to issue order, for
// the same reason issue order exists: three nines have to come out in the same sequence
// on every machine that builds the magazine.
export function topReviews(count: number): Review[] {
  return [...reviews].sort((a, b) => b.score - a.score || byIssueOrder(a, b)).slice(0, count);
}
