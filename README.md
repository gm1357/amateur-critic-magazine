# Amateur Critic Magazine

A movie-review aggregator that reads like a print magazine. You land on the cover, then the contents and an introduction; every page after that is one review. Page through with the Prev/Next links, the left and right arrow keys, or by linking straight to a review.

Every page is a sheet of A4. The sheet scales to fit whatever screen it's on and keeps its proportions, so a review that runs long scrolls inside the page rather than making it taller — and printing gives you the same page on real A4.

Built with Vite, React 19, react-router and Tailwind v4.

## Adding a review

Drop a JSON file into `src/data/reviews/`. **The filename is the URL slug** — `the-lighthouse.json` becomes `/reviews/the-lighthouse`.

```json
{
  "movie": "The Lighthouse",
  "score": 7,
  "date": "2026-03-22",
  "hearted": true,
  "review": "First paragraph...\n\nSecond paragraph..."
}
```

- `score` is a whole number from 1 to 10 — no fractions. It renders as five stars, one point per half star, so a 7 shows three and a half.
- `date` is an ISO calendar date, `YYYY-MM-DD`. It sets the review's position in the issue — pages run oldest first.
- `hearted` marks a favourite. Optional — leave it out and the review is simply not hearted.
- `review` is the body. Separate paragraphs with a blank line (`\n\n`); the first one gets the drop cap.

That's the whole step. The file is picked up at build time, so there's nothing to register and no index to update. If a field is missing or malformed, the build tests fail with the filename and the field that's wrong.

## Development

```
npm run dev        # dev server
npm run check      # format, types, lint
npm run test:all   # unit tests, then browser tests
npm run build      # type-check and build for production
```

See `CLAUDE.md` for the full command list and architecture notes.
