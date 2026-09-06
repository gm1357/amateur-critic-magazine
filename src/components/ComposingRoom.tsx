import { type Article, flows, pagesOf } from '../pages';
import Leaf from './Leaf';

type ComposingRoomProps = {
  articles: Article[];
  onParts: (path: string, parts: number) => void;
};

// Where the issue is typeset. Every article that flows is laid out once at the size a leaf
// actually is — the same components inside the same frame, so what is counted here is what
// will be printed — and reports how many leaves it took.
//
// It is out of flow, hidden and aria-hidden, so none of this is on the desk, under a
// pointer, in the accessibility tree, or on the printer.
export default function ComposingRoom({ articles, onParts }: ComposingRoomProps) {
  return (
    <div aria-hidden="true" className="composing-room">
      {articles.filter(flows).map((article) => (
        <Leaf
          key={article.path}
          onParts={(parts) => onParts(article.path, parts)}
          page={pagesOf(article, 1)[0]}
        />
      ))}
    </div>
  );
}
