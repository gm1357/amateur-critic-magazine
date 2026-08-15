// Locale and time zone are both pinned. Date-only strings parse as UTC midnight, so
// formatting in any negative-offset zone would render the previous day — CI and a US
// dev machine would disagree. Pinning the locale keeps Chromium and Firefox in step.
const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

type DatelineProps = {
  date: string;
};

export default function Dateline({ date }: DatelineProps) {
  return (
    <time className="text-[13px] tracking-[0.08em] text-muted" dateTime={date}>
      {formatter.format(new Date(date))}
    </time>
  );
}
