# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check (`tsc -b`) then build for production
- `npm run preview` — preview the production build
- `npm run test:unit` — run unit tests with Vitest once (non-watch)
- `npm run test:unit:watch` — run unit tests in watch mode
- `npm run test:browser` — run browser tests headlessly once (Playwright, Chromium + Firefox)
- `npm run test:browser:watch` — run browser tests headlessly in watch mode
- `npm run test:browser:headed` — run browser tests with a visible browser
- `npm run test:all` — run unit tests then browser tests
- `npm run lint` — lint with Oxlint (`.oxlintrc.json`)
- `npm run fmt` — format with Oxfmt (`.oxfmtrc.json`)
- `npm run fmt:check` — check formatting without writing
- `npm run typecheck` — type-check with `tsc -b --noEmit` (the `-b` matters: without it, `tsc` follows no project references and checks zero files)
- `npm run check` — run `fmt:check`, `typecheck`, and `lint` together
- `npm run commit` — commit via Commitizen (conventional-changelog prompt)

Run a single Vitest test by name: `npx vitest run -t "<test name>"` (add `--config=vitest.browser.config.ts` for browser tests).

## Required workflow after code changes

- Always run `npm run check` after making code changes to verify formatting, types, and lint all pass.
- Always add or update unit tests (`tests/unit/*.spec.ts`) or browser tests (`tests/browser/*.spec.tsx`) for any behavior you add or change.
- Always run the relevant test command (`npm run test:unit` and/or `npm run test:browser`) after making changes, and confirm it passes before considering the change done.
- Split work into **vertical slices**: each commit ships data, component, route, style, and tests together as a working increment. Never a commit that is one layer ("all the CSS", "all the components") or that defers its tests to a later commit.

## Architecture

A movie-review aggregator that reads like a print magazine: `/` is the cover, and each subsequent page is one review.

### The magazine

- `src/main.tsx` mounts `<App/>` into `#root` inside `StrictMode`, wrapped in `<BrowserRouter>`. Routes live in `src/App.tsx`. That split is deliberate — it lets browser tests render `<MemoryRouter><App/></MemoryRouter>` and exercise the real route table.
- **react-router v8, declarative mode** (`<Routes>`/`<Route>`, not `createBrowserRouter`) — all data is a compile-time glob, so there are no loaders or pending states. Note **`react-router-dom` does not exist in v8**; import everything from `react-router`.
- `src/components/MagazineLayout.tsx` is the pathless layout route: running head, `<Outlet/>`, `<PageNav/>`, and a `window` keydown effect for Left/Right arrow paging.
- Pagination is **not** derived from `useParams` — a pathless layout route cannot see its child's `:slug`. Instead `src/pages.ts` builds an ordered `Page[]` and `findPageIndex(pages, pathname)` matches on the pathname. A `-1` index means "not a page of this issue", which is the single signal that hides the running head and pager (used by the 404).
- An unknown slug still matches `reviews/:slug`, so the wildcard route never sees it — `ReviewPage` renders `<NotFound/>` itself.

### Review data

- Reviews are JSON files in `src/data/reviews/<slug>.json` with `movie`, `score`, `date` (ISO `YYYY-MM-DD`), and `review`. **The filename is the slug.**
- `score` is a **whole number from 1 to 10**, rendered by `ScoreBadge` as five stars at one point per half star. The half star is a clip, not a glyph: two identical star rows are stacked and the filled one is clipped to `score * 10`% of the width, so the cut always lands on a glyph edge or its exact midpoint. The badge carries `role="img"` with an `aria-label` of `"<score> out of 10"` — that label is what tests locate it by.
- `src/data/reviews.ts` picks them up with `import.meta.glob({ eager: true })` and sorts by `date` ascending, tie-broken by slug (glob key order is not stable across platforms).
- `src/data/review.ts` hand-rolls validation and throws naming the offending file and field. Date checking is two-step — an ISO shape test plus a `Date` round-trip — because `new Date('2026-02-31')` silently rolls over rather than failing.
- Because the glob is eager, the parser runs at **module evaluation**, so a malformed JSON does not fail `vite build` — it blanks the page at runtime. `tests/unit/reviews-data.spec.ts` imports the real `reviews` array specifically to turn that into a failing test run.

### Toolchain

- **Tailwind v4** via `@tailwindcss/vite`, wired into **both** `vite.config.ts` and `vitest.browser.config.ts`. There is no `tailwind.config.js` and no PostCSS — configuration is CSS, in `src/index.css`.
  - The palette lives in plain `:root` custom properties with a `prefers-color-scheme` override, surfaced through **`@theme inline`**. The `inline` is load-bearing: without it Tailwind inlines the value at build time and the media query never reaches the utilities. Because the tokens flip themselves, **JSX needs no `dark:` prefixes**.
  - The drop cap is a `@utility drop-cap`, applied as `first:drop-cap`.
  - Oxfmt does not sort Tailwind classes, and Tailwind only sees class-name _literals_ — never build one by string concatenation.
- **React Compiler** is enabled via `@rolldown/plugin-babel` + `reactCompilerPreset()` in `vite.config.ts`. This auto-memoizes at build time, so manual `useMemo`/`useCallback`/`React.memo` are unnecessary — write plain React. Note the compiler is _not_ wired into `vitest.browser.config.ts`, so browser tests run uncompiled.
- TypeScript uses solution-style config: `tsconfig.json` references `tsconfig.app.json` (app source, `strict`, bundler resolution) and `tsconfig.node.json` (build tooling). `tests/` is in neither, so **test files are not type-checked**.
- Two Vitest configs, split by directory:
  - `vite.config.ts`'s `test.dir` → `tests/unit/`, node environment, no DOM. Parser and page-model tests live here.
  - `vitest.browser.config.ts` → `tests/browser/`, real Chromium + Firefox via `@vitest/browser-playwright`.
  - Browser tests use `vitest-browser-react`'s `render` (awaited) with locator assertions (`await expect.element(...).toBeVisible()`), not `@testing-library/react`. `userEvent` comes from `vitest/browser`. Flat `test()` calls, no `describe`, relative imports — there are no path aliases.
- Linting/formatting are handled by the Oxc toolchain (Oxlint + Oxfmt), not ESLint/Prettier. VS Code is configured to format-on-save with the Oxc extension (`.vscode/settings.json`).
- Commits are enforced as Conventional Commits via commitlint + Husky's `commit-msg` hook; use `npm run commit` to get the guided prompt.
