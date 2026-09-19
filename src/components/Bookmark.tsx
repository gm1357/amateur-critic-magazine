import { Link } from 'react-router';
import { CONTENTS_PATH } from '../pages';

// The tab left in the book to find the listing again. It is furniture of the *book* rather
// than of the page — a control printed on a page would turn away with it, the same reason
// the pager stands on the desk — so it hangs from the foot of the left-hand leaf and stays
// where it is while the paper moves over it.
//
// A `Link`, so the URL is still the only thing that turns a page: a click from here
// animates back to the contents through exactly the path the pager and the arrow keys take.
export default function Bookmark() {
  return (
    <Link className="page-bookmark" to={CONTENTS_PATH}>
      {/* The label is the tab, and the tab is what moves. The link around it does not, so
          the hit area cannot slide out from under the cursor that is pulling it. It is set
          in sentence case and printed in capitals, the way the running head is, so the
          accessible name stays a sentence — and the line break is a newline in that same
          text rather than a `<br>`, which some engines would read out as no space at all. */}
      <span className="page-bookmark-tab">{'Go to\ncontents'}</span>
    </Link>
  );
}
