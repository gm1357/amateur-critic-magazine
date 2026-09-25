import { reviews } from './reviews';

// A still from the film, printed behind a review's masthead. Optional: a review with no
// frame keeps its plain paper. Globbed at compile time like the reviews, so the issue
// knows which reviews have one without asking the network, and Vite hashes the images.
const modules = import.meta.glob<string>('./frames/*.{avif,jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

function fileNameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

// The filename is the slug, the same contract the reviews keep. A frame that matches no
// review is a typo that would otherwise just never be printed, and two frames for one
// review leave it to glob order which one wins — both are failures, not fallbacks.
export function indexFrames(
  files: Record<string, string>,
  slugs: Iterable<string>,
): Map<string, string> {
  const known = new Set(slugs);
  const frames = new Map<string, string>();

  for (const path of Object.keys(files)) {
    const file = fileNameOf(path);
    const slug = file.replace(/\.[^.]+$/, '');

    if (!known.has(slug)) {
      throw new Error(`Invalid frame "${file}": no review has the slug "${slug}"`);
    }
    if (frames.has(slug)) {
      throw new Error(`Invalid frame "${file}": review "${slug}" already has a frame`);
    }
    frames.set(slug, files[path]);
  }

  return frames;
}

const frames = indexFrames(
  modules,
  reviews.map((review) => review.slug),
);

export function frameOf(slug: string): string | undefined {
  return frames.get(slug);
}
