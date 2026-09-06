import { useEffect, useState } from 'react';
import { type Article, buildPages, flows, type Page } from './pages';

export type Typeset = {
  pages: Page[];
  measured: (path: string, parts: number) => void;
  // Whether every article that can run over has been counted. Until it has, the issue on
  // hand is a guess — one leaf per article — and a page number read off it is not yet a
  // page number of this issue. It is also what puts the composing room away: an issue that
  // has been counted does not need a second copy of itself in the document.
  settled: boolean;
  // A token for "the issue is now cut into different pages". It changes when the counts
  // change and at no other time, which is what tells a page turn apart from a renumbering:
  // one is the reader moving through the issue, the other is the issue moving under them.
  edition: string;
};

// The issue counts its own pages. Every article that flows is laid out once off the desk,
// at the size a leaf actually is, and reports how many leaves it fragmented into; the model
// is rebuilt from those counts. It has to be measured rather than declared because how much
// paper a review takes is a fact about type — the same words are two pages on a phone and
// one on a desk, which is also why a desk that changes size sets the whole issue again.
export function useTypeset(list: Article[], desk: React.RefObject<HTMLElement | null>): Typeset {
  const [parts, setParts] = useState<Record<string, number>>({});

  function measured(path: string, count: number) {
    // Returning the same record is how this settles. The composing room reports after every
    // layout, and a report that agrees with what is already recorded must not start another
    // render — React bails out on an identical reference, and without that the magazine
    // would typeset itself forever.
    setParts((current) => (current[path] === count ? current : { ...current, [path]: count }));
  }

  // A leaf is measured off the desk, so a desk that changed size is an issue that has to be
  // set again — a narrower page holds fewer lines, exactly as a smaller sheet would. Empty
  // counts are what brings the composing room back.
  useEffect(() => {
    const node = desk.current;
    if (!node) return;

    let seen = `${node.clientWidth}x${node.clientHeight}`;

    const observer = new ResizeObserver(() => {
      const now = `${node.clientWidth}x${node.clientHeight}`;
      if (now === seen) return;

      seen = now;
      setParts((current) => (Object.keys(current).length === 0 ? current : {}));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [desk]);

  // Read off the article list rather than the record, so the token depends on the counts
  // and not on the order they happened to be reported in.
  const counts = list.map((article) => parts[article.path] ?? 1);

  return {
    pages: buildPages(list, (article) => parts[article.path] ?? 1),
    measured,
    settled: list.filter(flows).every((article) => parts[article.path] !== undefined),
    edition: counts.join(','),
  };
}
