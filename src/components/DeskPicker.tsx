import { DESKS, type Desk, parseDesk } from '../desk';

// Fixed to the corner of the screen rather than given a band of its own: a band would come
// straight off `--leaf-w`, and choosing a table must never re-typeset the issue. The list
// is drawn on the paper's own colours, because a native popup takes the select's text
// colour and that is dark on a light desk.
const SELECT =
  'fixed top-(--sheet-gutter) right-(--sheet-gutter) z-10 cursor-pointer rounded-sm border border-on-desk/25 bg-transparent px-2 py-1 text-xs tracking-[0.16em] text-on-desk uppercase print:hidden';

type DeskPickerProps = {
  value: Desk;
  onChange: (desk: Desk) => void;
};

// What the magazine is lying on. It stands on the desk like the pager does, so it never
// turns away with a page.
export default function DeskPicker({ value, onChange }: DeskPickerProps) {
  return (
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
  );
}
