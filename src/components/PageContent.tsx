import type { Page } from '../pages';
import Contents from './Contents';
import Cover from './Cover';
import ReviewPage from './ReviewPage';

// One dispatcher for every page of the issue. The magazine renders pages the URL is not
// pointing at — the facing page of a spread, the faces of a turning leaf — so a page has
// to be renderable from its model entry alone.
export default function PageContent({ page }: { page: Page }) {
  switch (page.kind) {
    case 'cover':
      return <Cover />;
    case 'contents':
      return <Contents />;
    case 'review':
      return <ReviewPage slug={page.slug} />;
  }
}
