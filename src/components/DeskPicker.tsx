import { DESKS, type Desk, parseDesk } from '../desk';

// Firefox cannot be trusted with tracked capitals inside a select. It sizes the box from
// the options without their letter-spacing, so the last letter of the longest desk was
// clipped; and it gives its hidden arrow the width of one letter-space, so a stray chevron
// a pixel wide was drawn after the text. The select therefore draws no text and no arrow
// of its own. A label under it shows the chosen desk in the magazine's tracked capitals,
// an invisible copy of the longest name holds the width, and the arrow is drawn here, the
// same in every engine. The select is still the control: on top, transparent, it takes
// every click and key and is what a screen reader reads.
const TYPE = 'px-2 py-1 pr-6 text-xs tracking-[0.16em] whitespace-nowrap uppercase';

const LONGEST = DESKS.reduce((a, b) => (b.label.length > a.label.length ? b : a)).label;

// Fixed to the corner of the screen rather than given a band of its own: a band would come
// straight off `--leaf-w`, and choosing a table must never re-typeset the issue.
const WRAP = 'fixed top-(--sheet-gutter) right-(--sheet-gutter) z-10 grid print:hidden';

const CELL = 'col-start-1 row-start-1 border';

// The list is drawn on the paper's own colours, because a native popup otherwise takes
// the select's text colour, which here is no colour at all. The focus ring is drawn in the
// desk's ink for the same reason: Firefox draws it in the text colour, and the default
// ring in Chromium is near black, which is no ring at all on a dark desk.
const SELECT = `${CELL} w-full cursor-pointer appearance-none rounded-sm border-on-desk/25 bg-transparent px-2 py-1 text-xs text-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-desk`;

type DeskPickerProps = {
  value: Desk;
  onChange: (desk: Desk) => void;
};

// What the magazine is lying on. It stands on the desk like the pager does, so it never
// turns away with a page.
export default function DeskPicker({ value, onChange }: DeskPickerProps) {
  const label = DESKS.find((desk) => desk.id === value)?.label;

  return (
    <div className={WRAP}>
      <span aria-hidden="true" className={`${CELL} invisible border-transparent ${TYPE}`}>
        {LONGEST}
      </span>

      <span
        aria-hidden="true"
        className={`${CELL} border-transparent text-on-desk ${TYPE}`}
        data-desk-label
      >
        {label}
      </span>

      <select
        aria-label="Desk"
        className={SELECT}
        onChange={(event) => onChange(parseDesk(event.target.value))}
        value={value}
      >
        {DESKS.map((desk) => (
          <option className="bg-paper text-ink" key={desk.id} value={desk.id}>
            {desk.label}
          </option>
        ))}
      </select>

      <svg
        aria-hidden="true"
        className="pointer-events-none col-start-1 row-start-1 mr-2 h-[0.5em] w-[0.75em] self-center justify-self-end text-xs text-on-desk"
        data-desk-arrow
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 12 8"
      >
        <path d="M1 1.5 6 6.5 11 1.5" />
      </svg>
    </div>
  );
}
