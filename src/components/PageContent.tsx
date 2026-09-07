import type { Page } from '../pages';
import BackCover from './BackCover';
import BlankPage from './BlankPage';
import Contents from './Contents';
import Cover from './Cover';
import Paginated from './Paginated';
import ReviewPage from './ReviewPage';

type PageContentProps = {
  onParts?: (parts: number) => void;
  page: Page;
  silent?: boolean;
};

// One dispatcher for every page of the issue. The magazine renders pages the URL is not
// pointing at — the facing page of a spread, the faces of a turning leaf — so a page has
// to be renderable from its model entry alone.
//
// An article that flows is handed to `Paginated` whole, on every one of its pages: the
// columns are the pagination, and the page decides which of them is on the paper.
export default function PageContent({ onParts, page, silent }: PageContentProps) {
  const { article } = page;

  switch (article.kind) {
    case 'cover':
      return <Cover />;
    case 'contents':
      return (
        <Paginated onParts={onParts} part={page.part} silent={silent}>
          <Contents />
        </Paginated>
      );
    case 'review':
      return (
        <Paginated onParts={onParts} part={page.part} silent={silent}>
          <ReviewPage slug={article.slug} />
        </Paginated>
      );
    case 'blank':
      return <BlankPage />;
    case 'back':
      return <BackCover />;
  }
}
