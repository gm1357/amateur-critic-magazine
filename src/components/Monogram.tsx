// The magazine's mark: the W and rule of `public/favicon.svg`, without the tile the icon
// sits on — on a page the paper is the tile. Coloured from the palette rather than
// hard-coded, so it follows the page onto a printer.
//
// It is sized by whoever places it, in the leaf's units — the drawing itself has no size.
// It repeats the title it sits beside, so it is hidden from the accessibility tree.
const W =
  'M29 4.41V5.09Q27.65 5.22 27.14 6.82L21.73 23.09H21L16.38 10.2L11.35 23.09H10.59L4.86 ' +
  '6.82Q4.51 5.82 4.19 5.52Q3.86 5.22 3 5.09V4.41H10.95V5.09Q9.89 5.17 9.55 5.4Q9.22 5.63 ' +
  '9.22 6.22Q9.22 6.52 9.41 7.11L12.65 16.95L15.84 8.63L14.89 6.03Q14.49 5.17 12.95 ' +
  '5.09V4.41H21.38V5.09Q21.22 5.11 21.03 5.11Q20.14 5.17 19.78 5.39Q19.43 5.6 19.43 ' +
  '6.09Q19.43 6.39 19.81 7.6L22.73 16.68L25.76 7.41Q25.95 6.87 25.95 6.28Q25.95 5.66 25.55 ' +
  '5.4Q25.16 5.14 24.08 5.09V4.41Z';

export default function Monogram({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="3 4.41 26 21.59">
      <path className="fill-ink" d={W} />
      <rect className="fill-accent" height="2" width="22" x="5" y="24" />
    </svg>
  );
}
