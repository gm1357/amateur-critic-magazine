import { MAGAZINE_TITLE } from '../magazine';
import type { Head } from '../seo';

// The one source of the document's head: the build prints it into each page's HTML, and the
// magazine renders it again once it has taken over from that HTML. See `clearPrintedHead`.
export default function PageHead({ head }: { head: Head }) {
  return (
    <>
      <title>{head.title}</title>
      <meta content={head.description} name="description" />
      {head.noindex && <meta content="noindex" name="robots" />}
      <link href={head.canonical} rel="canonical" />
      <meta content={MAGAZINE_TITLE} property="og:site_name" />
      <meta content={head.published ? 'article' : 'website'} property="og:type" />
      <meta content={head.title} property="og:title" />
      <meta content={head.description} property="og:description" />
      <meta content={head.canonical} property="og:url" />
      {head.image && <meta content={head.image} property="og:image" />}
      {head.published && <meta content={head.published} property="article:published_time" />}
      <meta content={head.image ? 'summary_large_image' : 'summary'} name="twitter:card" />
    </>
  );
}

export function MissingHead() {
  return (
    <>
      <title>{`Page not found · ${MAGAZINE_TITLE}`}</title>
      <meta content="noindex" name="robots" />
    </>
  );
}
