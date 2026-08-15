import { parseReview, type Review } from './review';

const modules = import.meta.glob<unknown>('./reviews/*.json', {
  eager: true,
  import: 'default',
});

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
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
  // correctly as strings. The slug tie-break keeps the order deterministic — glob key
  // order is not guaranteed stable across platforms, and two reviews sharing a date
  // would otherwise be free to swap page numbers between a local run and CI.
  loaded.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.slug.localeCompare(b.slug),
  );

  return loaded;
}

export const reviews: Review[] = loadReviews();

export function findReview(slug: string | undefined): Review | undefined {
  return reviews.find((review) => review.slug === slug);
}
