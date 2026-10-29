---
name: run-the-weekend-critic
description: Build, run, screenshot and drive The Weekend Critic app. Use when asked to start the dev server, run or build the magazine, take a screenshot of a page, spread or page turn, check the print/PDF output, or interact with the running app rather than only its tests.
---

A Vite + React 19 single-page app that renders a movie-review issue as a printed
magazine. There is no `chromium-cli` in this container, so the harness is
`.claude/skills/run-the-weekend-critic/driver.mjs` — a line-oriented
Playwright driver that reads commands on stdin. Start the dev server, pipe it a
script (or drive it under tmux), and it navigates, turns pages by dragging the
paper, screenshots, and prints to PDF.

All paths below are relative to the repo root.

## Prerequisites

Nothing to `apt-get`. Node 24 (`.nvmrc`) and `npm ci` are the whole setup —
Playwright and its browsers come in with `@vitest/browser-playwright`, which the
browser test suite already depends on:

```bash
npm ci
```

The driver imports `playwright` by bare specifier, so it **must be run from
inside the repo** (its own directory is under the repo, which is what makes the
resolution work). Copying it to `/tmp` gives `ERR_MODULE_NOT_FOUND`.

## Run (agent path)

### 1. Start the dev server

```bash
npm run dev > /tmp/twc-dev.log 2>&1 &
timeout 40 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 0.5; done'
```

Stop it by killing the listener — npm does not forward SIGTERM to the vite it
spawned, so `kill $!` leaves the port held:

```bash
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill
```

### 2. Drive it

```bash
node .claude/skills/run-the-weekend-critic/driver.mjs <<'EOF'
nav /
state
drag forward 1
state
size 1280 900
state
turnshot forward 0.4 spread-turn
shot spread
errors
EOF
```

Every command prints its result then `ok` (or `err <message>`); startup prints
`DRIVER READY <browser> <base> shots=<dir>`. Screenshots and PDFs land in
`/tmp/twc-shots/`, numbered in order (`01-spread.png`); the counter resets each
run, so a rerun overwrites.

| command                               | what it does                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nav <path>`                          | Go to `http://localhost:5173<path>` and wait for React to mount                                                                                               |
| `state`                               | The one-line proof of where you are: URL, mode, **which pages are on the desk** (`leaves=[…]`, read off each leaf's `data-page`), and the pager's folio range |
| `size <w> <h>`                        | Resize; prints the resulting `mode`. Crossing 1024px flips `single` ⇄ `spread`                                                                                |
| `shot [name]`                         | Full-page screenshot → `/tmp/twc-shots/NN-name.png`                                                                                                           |
| `turnshot <dir> <progress> [name]`    | Hold a leaf mid-air at `progress` of its arc, screenshot the 3D turn, then let go                                                                             |
| `drag <forward\|backward> [progress]` | Turn a page by dragging the paper edge. `progress` is a fraction of a whole turn: `1` completes it, `0.3` falls back                                          |
| `key <Key>`                           | Press a key on `body` — `ArrowRight` / `ArrowLeft` page the issue                                                                                             |
| `click <selector>`                    | Click (waits out the turn animation)                                                                                                                          |
| `wait <selector>`                     | Wait for visible, 10s                                                                                                                                         |
| `text <selector>`                     | `innerText` of the first match, newlines flattened to `\|`                                                                                                    |
| `eval <js>`                           | Evaluate in the page, JSON-stringified result                                                                                                                 |
| `media <print\|screen>`               | Re-render under the print palette (or back)                                                                                                                   |
| `pdf [name]`                          | Print the whole issue to A4 → `/tmp/twc-shots/<name>.pdf` (chromium only)                                                                                     |
| `errors`                              | Console errors + uncaught page errors collected so far                                                                                                        |
| `url`, `quit`                         | —                                                                                                                                                             |

Env: `TWC_BASE` (default `http://localhost:5173`), `TWC_BROWSER`
(`chromium` | `firefox`, default chromium), `TWC_SHOTS` (default `/tmp/twc-shots`).
The driver opens at 414×896 — the same viewport `vitest.browser.config.ts`
pins — so it reads the issue one leaf at a time until you `size` it wider.

Both browsers the test suite uses work; Firefox is the one that historically
broke on the 3D turn, so re-run a flip change there too:

```bash
TWC_BROWSER=firefox node .claude/skills/run-the-weekend-critic/driver.mjs <<'EOF'
nav /
drag forward 1
state
shot firefox-contents
EOF
```

### 3. Interactive (tmux)

```bash
tmux new-session -d -s twc -x 200 -y 50 -c "$PWD"
tmux send-keys -t twc 'node .claude/skills/run-the-weekend-critic/driver.mjs' Enter
timeout 30 bash -c 'until tmux capture-pane -pt twc | grep -q "DRIVER READY"; do sleep 0.2; done'
tmux send-keys -t twc 'nav /contents' Enter
tmux send-keys -t twc 'click a[href="/reviews/wake-up-dead-man"]' Enter
tmux send-keys -t twc 'state' Enter
tmux capture-pane -pt twc -S -200 | grep -v '^$' | tail -20
```

### The URLs

`/` cover, `/contents`, `/introduction`, then `/reviews/<slug>` for each JSON file in
`src/data/reviews/` (`the-celebration`, `nirvana-band-show-movie`, `the-drama`,
`wake-up-dead-man`), ordered by their `date`. Anything else is the 404 — which
renders a bare leaf with no `data-page`, no running head and no pager, so
`state` reports `leaves=[] nav=(none)`.

## Run (production build)

```bash
npm run build                     # tsc -b && vite build -> dist/
npm run preview &                 # :4173
timeout 30 bash -c 'until curl -sf http://localhost:4173 >/dev/null; do sleep 0.5; done'
TWC_BASE=http://localhost:4173 node .claude/skills/run-the-weekend-critic/driver.mjs <<'EOF'
nav /reviews/the-drama
state
EOF
lsof -ti:4173 -sTCP:LISTEN | xargs -r kill
```

`vite preview` serves the SPA fallback, so deep links return 200. A dumb static
host would 404 them — that is a deploy concern, not a bug here.

## Run (human path)

`npm run dev`, open <http://localhost:5173>. Page with the Prev/Next links, the
arrow keys, or by dragging the page edge. Useless headless.

## Test / check

```bash
npm run check        # oxfmt --check, tsc -b --noEmit, oxlint
npm run test:unit    # 4 files, 53 tests, ~0.2s
npm run test:browser # 18 files, 116 tests, chromium + firefox, ~13s
```

All green as of this writing. `npm run check` **lints the driver too** — oxfmt
globs the whole repo including `.claude/`, so run `npm run fmt` after editing
`driver.mjs` or `check` fails on it.

## Gotchas

- **`drag forward 0.5` is a coin flip.** The leaf sweeps 0°→180° over one
  leaf-width of travel, so exactly 0.5 leaves it at 90° and the settle is
  decided by flick velocity — which `useFlip` measures over a window of
  samples, so it depends on how many steps the driver took. 24 steps read as
  "stationary" and fell back; 10 steps read as a throw and completed. Use `1`
  to turn and `0.3` to fall back; never `0.5`.
- **A mouse can only grab the page edge.** `src/useFlip.ts` offers
  swipe-from-anywhere to touch pointers only, so the driver's drag starts on
  the `.turn-zone` grip (9% of the leaf, at the outer edge). A drag from the
  middle of the page does nothing.
- **`state`, not `url`, is the assertion.** The URL is one page; the desk shows
  one or two. Reading `spread` mode, `/introduction` puts the last leaf of
  `/contents` on the left — `state` reports both, `url` hides it.
- **Viewport is model, not styling.** 1024px (`64rem`, `src/useMode.ts`) decides
  whether the issue opens as a spread, which changes what a Next click does
  (one leaf = two pages). Always `size` before asserting on paging.
- **`text [role=img]` on a score prints ten stars.** The badge stacks two
  identical star rows and clips the filled one. Read the score with
  `eval document.querySelector('[role=img]').getAttribute('aria-label')`
  → `"8 out of 10"`.
- **`media print` overflows a phone viewport.** Under print the leaf takes its
  true 210mm, so a 414px-wide screenshot is clipped. Use `pdf`, or `size 1280
1400` first.
- **`tmux capture-pane -p | tail -20` comes back blank.** The pane is 50 rows
  and the output sits at the top, so `tail` returns the trailing blanks. Use
  `-S -200 | grep -v '^$' | tail -20`.
- **Screenshots are quiet about failure.** A blank-looking page still screenshots
  fine; finish every script with `errors`.

## Troubleshooting

- **`Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'playwright'`**: the
  driver was run from outside the repo. `cd` to the repo root and use the
  `.claude/skills/...` path.
- **`Port 5173 is in use, trying another one...` → `Local: http://localhost:5174/`**:
  a dev server is already running and vite silently moved. The driver still
  points at 5173 and drives the _old_ server. Kill the listener
  (`lsof -ti:5173 -sTCP:LISTEN | xargs -r kill`) before relaunching, or pass
  `TWC_BASE=http://localhost:5174`.
- **`err no .magazine-book on the page`**: the URL is not a page of the issue
  (the 404 renders a bare leaf without the book), or `nav` was never run.
- **`err pdf needs TWC_BROWSER=chromium`**: `page.pdf()` is chromium-only.
- **A drag "did nothing" (`state` unchanged)**: check `progress` — see the
  0.5 gotcha above — and that the leaf you grabbed exists: there is no backward
  turn on the cover and no forward turn on the last page.
