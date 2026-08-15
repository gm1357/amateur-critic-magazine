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
- `npm run typecheck` — type-check with `tsc --noEmit`
- `npm run check` — run `fmt:check`, `typecheck`, and `lint` together
- `npm run commit` — commit via Commitizen (conventional-changelog prompt)

Run a single Vitest test by name: `npx vitest run -t "<test name>"` (add `--config=vitest.browser.config.ts` for browser tests).

## Required workflow after code changes

- Always run `npm run check` after making code changes to verify formatting, types, and lint all pass.
- Always add or update unit tests (`tests/*.spec.tsx`-style) or component/browser tests for any behavior you add or change.
- Always run the relevant test command (`npm run test:unit` and/or `npm run test:browser`) after making changes, and confirm it passes before considering the change done.

## Architecture

This is a minimal Vite + React 19 + TypeScript template (not yet a built-out app):

- Entry point `src/main.tsx` mounts `src/App.tsx` into `#root` inside `StrictMode`.
- `src/App.tsx` is the only component so far — the default Vite/React starter counter demo.
- **React Compiler** is enabled via `@rolldown/plugin-babel` + `reactCompilerPreset()` in `vite.config.ts`. This auto-memoizes components/hooks at build time, so manual `useMemo`/`useCallback`/`React.memo` are generally unnecessary — write plain React and let the compiler optimize it.
- TypeScript project uses solution-style config: `tsconfig.json` references `tsconfig.app.json` (app source, bundler resolution, strict unused-locals/params) and `tsconfig.node.json` (build tooling config files).
- Two separate Vitest configs:
  - Default (`vite.config.ts`'s `test` field, if any, or Vitest defaults) for `tests/*.spec.tsx` unit-ish tests using `vitest-browser-react`'s `render`.
  - `vitest.browser.config.ts` runs the same-style tests in real browsers via `@vitest/browser-playwright` (Chromium + Firefox instances).
  - Test files matching component tests use `vitest-browser-react`'s `render`/`page` APIs (locator-based assertions like `screen.getByRole(...).click()`), not `@testing-library/react`.
- Linting/formatting are handled by the Oxc toolchain (Oxlint + Oxfmt), not ESLint/Prettier. VS Code is configured to format-on-save with the Oxc extension (`.vscode/settings.json`).
- Commits are enforced as Conventional Commits via commitlint + Husky's `commit-msg` hook; use `npm run commit` to get the guided prompt.
