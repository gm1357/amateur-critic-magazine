// The still behind a review's masthead. It is decoration — the masthead in front of it
// already says which film this is — so it is kept out of the accessibility tree.
//
// `object-cover` fills the band whatever shape the title leaves it: the photograph is
// cropped rather than stretched, and never leaves paper showing at an edge. The scrim over
// it is what lets the type stay light and readable on any frame.
export default function ReviewFrame({ src }: { src: string }) {
  return (
    <div aria-hidden="true" className="review-frame" data-frame>
      <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" src={src} />
      <div className="absolute inset-0 bg-black/45" />
    </div>
  );
}
