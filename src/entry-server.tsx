import { reviews } from './data/reviews';
import { articles } from './pages';
import { sitemapOf } from './seo';

// What the build writes out after the client bundle exists. This is its own entry because it
// has to go through Vite: the issue is globbed at compile time, and the frames' hashed URLs
// only exist there.
export function sitemap(): string {
  return sitemapOf(articles, reviews);
}
