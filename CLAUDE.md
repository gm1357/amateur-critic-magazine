# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A movie-review aggregator that reads like a print magazine: `/` is the cover, `/contents` is the table of contents, `/introduction` opens the issue, and each subsequent page is one review.

`docs/architecture.md` has the reasoning behind every rule below. Read the relevant section before changing page turns, gestures, typesetting, zoom, the bookmark or the test setup.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check, build for production, then prerender every article into `dist/`
- `npm run check` — run `fmt:check`, `typecheck`, and `lint` together
- `npm run fmt` — format with Oxfmt
- `npm run test:unit` — run unit tests once
- `npm run test:browser` — run browser tests once (Playwright, Chromium + Firefox)
- `npm run test:all` — run unit tests then browser tests
- `npm run commit` — commit via Commitizen

Run a single Vitest test by name: `npx vitest run -t "<test name>"` (add `--config=vitest.browser.config.ts` for browser tests).

## Required workflow after code changes

- Always run `npm run check` after making code changes to verify formatting, types, and lint all pass.
- Always add or update unit tests (`tests/unit/*.spec.ts`) or browser tests (`tests/browser/*.spec.tsx`) for any behavior you add or change.
- Always run the relevant test command (`npm run test:unit` and/or `npm run test:browser`) after making changes, and confirm it passes before considering the change done.
- Split work into **vertical slices**: each commit ships data, component, route, style, and tests together as a working increment. Never a commit that is one layer ("all the CSS", "all the components") or that defers its tests to a later commit.

## Rules

### The magazine and page turns

- `src/pages.ts` is the issue's URL contract, so `src/App.tsx` stays **one route**. Don't add a route table.
- `react-router-dom` does not exist in v8; import everything from `react-router`.
- `src/components/PageContent.tsx` is the only place that turns a model entry into a page component.
- Every function in `src/spread.ts` takes the mode (`single` | `spread`). `anchorOf` must stay a right inverse of `spreadOf`.
- The URL is the only thing that turns a page. `src/useFlip.ts` animates the difference, so the pager, the arrow keys and every link share one path.
- `useFlip` effect deps must be primitives or state objects, never anything derived, or the magazine turns pages forever.
- A drag must not re-render the pages under it: write the angle straight to the node.
- `.leaf-turn` must never carry `overflow`, `opacity`, `filter` or `contain: paint`, which flatten the 3D turn. Clipping belongs on `.leaf-face`.
- Gesture and zoom arithmetic stays pure, in `src/flip.ts` and `src/zoom.ts`, tested in node.

### Page layout

- A page is a **pure scale of its leaf**: every length on it is `cqw`, `em`, `%` or `ch`, never `vw`, `vh`, `px` or `rem` (`1rem ≡ 2cqw`). Hairline borders are the one exception.
- Anything that adds a scroller inside a page must carry `touch-action: pan-y`.
- `.magazine-chrome` must not grow: its height comes straight off every leaf in the issue.
- Choosing a desk or zooming must never re-typeset the issue.
- At fit, nothing is on: the zoom transform, clip and `touch-action` override are all gated on `[data-zoom='in']`.
- The zoom wheel listener must be native and non-passive, because React attaches `wheel` passively.

### Typesetting

- **Nothing scrolls.** An article too long for its leaf continues on the next one.
- An `Article` is content known at compile time; a `Page` is one leaf. `pages` is **state, not a constant**, because page counts are measured. The module-level `pages` export is the untypeset issue.
- Article roots must be **block flow, not flex**. Small flex rows inside them are fine, with `break-inside-avoid`.
- Re-cutting the issue is not a page turn, and the correction happens **during render, not in an effect**.

### Reaching crawlers

- The build prints every article to HTML through `src/entry-server.tsx` and `scripts/prerender.js`. The client **replaces** that HTML and never hydrates it, because typesetting needs a browser.
- `src/components/PageHead.tsx` is the one source of head tags, and it renders in `Magazine`, never in a page component: a spread mounts two pages.
- A tag the build prints into the head must be marked `data-printed`, or it stays beside React's own for good. React only adopts head tags when hydrating.
- JSON-LD is printed by the build only. In `PageHead` it would land in the body as a second copy.
- `vercel.json` must not get a catch-all rewrite, which makes every missing page a 200. A new article kind that `flows` needs its own continuation rewrite.

### Review data

- Reviews are `src/data/reviews/<slug>.json` with `movie`, `score` (whole number, 1–10), `date` (ISO `YYYY-MM-DD`), `review`, and optional `hearted` and `year` (when the film first screened). **The filename is the slug.**
- A film still is `src/data/frames/<slug>.{avif,jpg,jpeg,png,webp}`.
- The parser runs at module evaluation, so a malformed JSON passes `vite build` and blanks the page at runtime. `tests/unit/reviews-data.spec.ts` is what catches it.

### Toolchain

- **Tailwind v4** is configured in `src/index.css`. The `inline` in `@theme inline` is load-bearing: the print palette depends on it.
- The issue is dark only: no `dark:` prefixes. Never build a class name by string concatenation.
- **React Compiler** is on, so don't write `useMemo`, `useCallback` or `React.memo`. It's off in browser tests, which run uncompiled.
- `tests/` is not type-checked.
- Linting and formatting use Oxlint and Oxfmt, not ESLint or Prettier.
- Commits are Conventional Commits, enforced by commitlint.

### Tests

- Unit tests live in `tests/unit/` (node, no DOM). Browser tests live in `tests/browser/` (real Chromium and Firefox).
- Browser tests use `vitest-browser-react`'s `render` with locator assertions, `userEvent` from `vitest/browser`, flat `test()` calls, and relative imports.
- The issue typesets itself, so a test cannot import how long it is. Use `tests/browser/issue.ts` and assert turns as moves from wherever the issue opened.
- For pointer gestures use `tests/browser/pointer.ts`, and dispatch on the **element**, never on `window`.
- Do not merge the Firefox instances in `vitest.browser.config.ts`. One Firefox running several files delivers input to the wrong page.
- Raise the poll budget in the config, not per call.
