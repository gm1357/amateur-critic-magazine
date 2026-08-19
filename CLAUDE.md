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

A movie-review aggregator that reads like a print magazine: `/` is the cover, `/contents` is the table of contents, and each subsequent page is one review.

### The magazine

- `src/main.tsx` mounts `<App/>` into `#root` inside `StrictMode`, wrapped in `<BrowserRouter>`. `src/App.tsx` holds the routing. That split is deliberate — it lets browser tests render `<MemoryRouter><App/></MemoryRouter>` and drive the app by URL.
- **react-router v8, declarative mode** (`<Routes>`/`<Route>`, not `createBrowserRouter`) — all data is a compile-time glob, so there are no loaders or pending states. Note **`react-router-dom` does not exist in v8**; import everything from `react-router`.
- `src/App.tsx` is **one route** — `<Route path="*" element={<Magazine/>}/>` — because `src/pages.ts` is the issue's URL contract. A route table would restate that mapping in a second place, and it could never render the pages the URL is _not_ pointing at, which is most of what the magazine puts on screen.
- `src/components/Magazine.tsx` is the whole page: the desk, a `<Spread/>`, `<PageNav/>`, and a `window` keydown effect for Left/Right arrow paging. It renders pages by looking the pathname up in `pages`, never from a matched route.
- `src/components/PageContent.tsx` dispatches on `Page.kind` (`cover` | `contents` | `review`). It is the only place that turns a model entry into a page component, so any page can be rendered anywhere.
- The issue is read as an **open book**: `src/spread.ts` models it as a stack of leaves, where leaf `L` carries `pages[2L]` on its front and `pages[2L+1]` on its back. Spread `s` is therefore the back of leaf `s-1` facing the front of leaf `s`, which is why the cover — page one, the front of the first leaf — sits alone on the right. `spreadOf(mode, i)` is `⌈i/2⌉`.
- **Mode** (`single` | `spread`) is part of the model, not a detail beside it: two facing A4 pages need about a laptop's width before either is readable, so below `64rem` (`src/useMode.ts`) the issue opens one leaf at a time and `spreadOf` is the identity. Every model function takes the mode.
- `anchorOf` is the URL a spread is addressed by, and it **must** be a right inverse of `spreadOf` — a page turn that landed on a URL belonging to a different spread would make the magazine immediately turn again to correct itself. `tests/unit/spread-model.spec.ts` asserts that round trip as a property.
- Paging steps by **leaf, not by page**: two facing pages are one turn, so on a wide desk Next moves past both. Reading one leaf at a time this is the same step it has always been, which is why the pager prints a range (`2–3 / 6`) only when there is a range to print.
- **Turning a page.** `planTurn(from, to, direction)` in `src/spread.ts` arranges four slots — two static halves plus the front and back of the leaf in the air — so that at 0° the composition is pixel-identical to the spread being left and at ±180° pixel-identical to the one being joined. Every edge case falls out of that property rather than being special-cased: the cover opening onto bare desk, the book closing, the blank recto at the back, one leaf at a time, and a contents entry several spreads ahead rendering as a single believable turn.
- The URL is the only thing that turns a page. `src/useFlip.ts` watches the spread under the pathname and animates the difference, so the pager, the arrow keys and every link animate through one path. Its effect deps are primitives and state objects only — a dep on anything *derived* (a spread, a plan) is a fresh object every render once the compiler is not memoising, which is the case in the browser tests, and the magazine would turn pages forever.
- The turn runs on the **Web Animations API**, not a CSS transition: `finished` is a reliable promise, it still resolves at `duration: 0` (which is how reduced motion lands the leaf instantly rather than stranding the state machine), `cancel()` interrupts it, and a keyframe effect cleanly overrides the inline angle a drag writes. `fill: 'forwards'` is not optional — without it the last frame is dropped before React commits the landed spread and the leaf snaps back for a frame.
- `.leaf-turn` must never carry `overflow`, `opacity`, `filter` or `contain: paint`. Any grouping property forces `transform-style: preserve-3d` to compute to `flat` and the turn collapses into a 2D squash. Clipping belongs on `.leaf-face`. `tests/browser/flip.spec.tsx` asserts the computed transform is a `matrix3d` for exactly this reason.
- Perspective and the 3D context exist **only while a leaf is in the air** (`[data-phase]` on the book), and the page scrollers are frozen for the same window. At rest the paper carries no transform at all, so type rasterises crisply and no browser is asked to composite a scrolling page inside a 3D context — which is the Firefox trouble spot this avoids by construction rather than by workaround.
- The running head and folio are printed on each leaf; the pager is not. A control printed on a page would turn away with it, so `PageNav` stands on the desk under the book, sized to the book's width and following the URL rather than the paper.
- Every page is one **A4 leaf** (210 × 297 mm, ISO 216) on a `bg-desk` backdrop. The desk owns the ruler: `magazine-desk` in `src/index.css` derives `--leaf-w` from physical A4 capped by whichever viewport axis runs out first (minus `--desk-chrome`, the height the pager takes), and the book, the leaves and the pager are all measured off that one value. The leaf's height comes from `aspect-ratio`, never from the content. That only holds because the page sits in a `min-h-0 flex-1 overflow-y-auto` wrapper — a review longer than the page scrolls **inside** the leaf instead of stretching it.
- **The leaf** is the `@container`, so page type is sized in `cqw` and page margins in `%`. Nothing inside a page may be sized in `vw`/`vh` or in fixed `px`: the composition has to survive the leaf being scaled down to a phone, and the ruler for that is one page — not the viewport, and not the open book. Put the container on the spread instead and every page would set its type twice as large the moment the desk got wide.
- `@page { size: A4 portrait }` plus a `print:` pass on the layout means Ctrl-P prints the real thing: the desk and pager drop away, each leaf takes its true 210 × 297 mm, and a spread's blank half is not a page at all. The break is `.a4-leaf ~ .a4-leaf { break-before: page }` — _between_ leaves rather than after them, so the last page does not push a blank sheet out of the printer. A `@media print` palette override at the end of the palette block keeps the paper white when the reader is in dark mode.
- Pagination is **not** derived from `useParams`. `src/pages.ts` builds an ordered `Page[]` and `findPageIndex(pages, pathname)` matches on the pathname. A `-1` index means "not a page of this issue" — the single signal that renders the 404 and hides the running head and pager.
- The contents is a page of the issue like any other, so it paginates and prints for free. It reads its folios back out of `pages` via `findPageNumber`, so a page inserted into `buildPages` renumbers the listing with it rather than leaving it to drift.
- An unknown slug is just a pathname `pages` does not list, so it takes the same `-1` path as any other address outside the issue. `ReviewPage` takes its `slug` as a prop and never touches the router.

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
  - `vitest.browser.config.ts` → `tests/browser/`, real Chromium + Firefox via `@vitest/browser-playwright`. Its `browser.viewport` is **pinned** (414 × 896) rather than inherited, because it decides whether the suite reads the issue as a spread or one leaf at a time. `tests/browser/spread.spec.tsx` is the one file that widens it, and hands the size back in an `afterEach`.
  - Browser tests use `vitest-browser-react`'s `render` (awaited) with locator assertions (`await expect.element(...).toBeVisible()`), not `@testing-library/react`. `userEvent` comes from `vitest/browser`. Flat `test()` calls, no `describe`, relative imports — there are no path aliases.
- Linting/formatting are handled by the Oxc toolchain (Oxlint + Oxfmt), not ESLint/Prettier. VS Code is configured to format-on-save with the Oxc extension (`.vscode/settings.json`).
- Commits are enforced as Conventional Commits via commitlint + Husky's `commit-msg` hook; use `npm run commit` to get the guided prompt.
