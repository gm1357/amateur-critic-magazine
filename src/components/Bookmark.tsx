import { Link } from 'react-router';
import { CONTENTS_PATH } from '../pages';

// The ribbon left in the book to find the listing again. It is furniture of the *book*
// rather than of the page — a control printed on a page would turn away with it, the same
// reason the pager stands on the desk — so it hangs from the bottom of the left-hand leaf
// and stays where it is while the paper moves over it.
//
// A `Link`, so the URL is still the only thing that turns a page: a click from here
// animates back to the contents through exactly the path the pager and the arrow keys take.
export default function Bookmark() {
  return (
    <Link
      aria-label="Back to contents"
      className="page-bookmark"
      title="Contents"
      to={CONTENTS_PATH}
    >
      <span aria-hidden="true" className="page-bookmark-tab" />
    </Link>
  );
}
