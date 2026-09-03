#!/usr/bin/env node
// Headless-Chromium driver for Amateur Critic Magazine.
//
// Reads one command per line on stdin, so it works both piped (heredoc) and
// interactively under tmux. Prints `ok` after every command and `DRIVER READY`
// once the browser is up — poll for those rather than sleeping.
//
//   node .claude/skills/run-amateur-critic-magazine/driver.mjs <<'EOF'
//   nav /
//   shot cover
//   EOF
//
// Playwright comes in via @vitest/browser-playwright, so there is nothing extra
// to install: the browsers the browser test suite uses are the ones this drives.

import { createInterface } from 'node:readline';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, firefox } from 'playwright';

const BASE = process.env.ACM_BASE ?? 'http://localhost:5173';
const SHOTS = resolve(process.env.ACM_SHOTS ?? '/tmp/acm-shots');
// 414x896 matches vitest.browser.config.ts, so the driver reads the issue the
// same way the browser suite does: one leaf at a time, below the 64rem spread
// breakpoint in src/useMode.ts.
const START = { width: 414, height: 896 };

mkdirSync(SHOTS, { recursive: true });

const browserName = process.env.ACM_BROWSER ?? 'chromium';
const launcher = browserName === 'firefox' ? firefox : chromium;
const browser = await launcher.launch({ args: browserName === 'chromium' ? ['--no-sandbox'] : [] });
const context = await browser.newContext({ viewport: START });
const page = await context.newPage();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

let shotN = 0;

// The book is the pair of leaves on the desk; the leaf is one A4 page. Both are
// addressed by class rather than by test id — the app ships no test ids.
const BOOK = '.magazine-book';

async function shot(name) {
  const file = `${SHOTS}/${String(++shotN).padStart(2, '0')}-${name || 'shot'}.png`;
  await page.screenshot({ path: file });
  return file;
}

// A page turn is a pointer drag across the book, which is what a reader's finger
// does and what src/useFlip.ts listens for. A mouse has to start on the page edge
// — the `.turn-zone` grip, 9% of the leaf — because the swipe-from-anywhere path
// is offered to touch only.
//
// `progress` is the fraction of a whole turn: the leaf sweeps 0° to ±180° over
// one leaf-width of travel, so 1 lays it flat on the facing page and 0.3 lets it
// fall back. Avoid exactly 0.5 — see the Gotchas in SKILL.md.
async function drag(direction, progress = 1, steps = 24, midAir) {
  const box = await page.locator(BOOK).boundingBox();
  if (!box) throw new Error('no .magazine-book on the page');
  // The book is one leaf wide reading single, two facing leaves reading spread.
  const leafW = box.width / ((await page.locator('.a4-leaf, .leaf-blank').count()) || 1);
  const y = box.y + box.height / 2;
  // Grab the outer edge of the leaf that turns: the right edge goes forward.
  const forward = direction !== 'backward';
  const startX = forward ? box.x + box.width - 6 : box.x + 6;
  const travel = leafW * progress * (forward ? -1 : 1);

  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (travel * i) / steps, y);
    await page.waitForTimeout(8);
  }
  const mid = midAir ? await midAir() : undefined;
  await page.mouse.up();
  // The URL moves when the reader lets go; the paper lands a beat later.
  await page.waitForTimeout(700);
  return mid;
}

const commands = {
  async nav(path = '/') {
    await page.goto(path.startsWith('http') ? path : BASE + path, { waitUntil: 'load' });
    await page.waitForSelector('#root > *');
    return page.url();
  },
  async size(w, h) {
    await page.setViewportSize({ width: Number(w), height: Number(h ?? 900) });
    // The mode is a matchMedia store; give React the frame it needs to re-render.
    await page.waitForTimeout(150);
    return `${w}x${h ?? 900} mode=${await page.locator('[data-mode]').getAttribute('data-mode')}`;
  },
  async shot(name) {
    return shot(name);
  },
  async click(...sel) {
    await page.click(sel.join(' '));
    await page.waitForTimeout(700);
    return page.url();
  },
  async key(k) {
    await page.locator('body').press(k);
    await page.waitForTimeout(700);
    return page.url();
  },
  async drag(direction = 'forward', progress = '1') {
    await drag(direction, Number(progress));
    return page.url();
  },
  // The flip is the one thing a resting screenshot cannot show. This holds the
  // leaf in the air at `progress` of its arc, shoots it, then lets go.
  async turnshot(direction = 'forward', progress = '0.35', name = 'turn') {
    const file = await drag(direction, Number(progress), 18, () => shot(name));
    return file;
  },
  async text(...sel) {
    return (await page.locator(sel.join(' ')).first().innerText()).replace(/\n+/g, ' | ');
  },
  async wait(...sel) {
    await page.locator(sel.join(' ')).first().waitFor({ state: 'visible', timeout: 10_000 });
    return 'visible';
  },
  async url() {
    return page.url();
  },
  // What is actually on the desk right now. Every leaf carries `data-page` (its
  // path in src/pages.ts), so this reports the pages on screen rather than the one
  // the URL points at — which is the distinction the whole magazine turns on. The
  // cheapest proof a turn landed where it should.
  async state() {
    const leaves = await page
      .locator('.a4-leaf[data-page]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-page')));
    const nav = await page
      .locator('nav[aria-label="Pages"]')
      .innerText()
      .catch(() => '(none)');
    const mode = await page.locator('[data-mode]').getAttribute('data-mode');
    return `url=${new URL(page.url()).pathname} mode=${mode} leaves=[${leaves.join(', ')}] nav=${nav.replace(/\n+/g, ' ')}`;
  },
  // Ctrl-P is a first-class output of this app: the desk and pager drop away and
  // each leaf takes its true 210x297mm. `media print` re-renders the current page
  // under the print palette; `pdf` writes the whole issue as A4 (chromium only).
  async media(kind = 'print') {
    await page.emulateMedia({ media: kind === 'screen' ? 'screen' : 'print' });
    await page.waitForTimeout(150);
    return kind;
  },
  async pdf(name = 'issue') {
    if (browserName !== 'chromium') throw new Error('pdf needs ACM_BROWSER=chromium');
    const file = `${SHOTS}/${name}.pdf`;
    await page.pdf({ path: file, format: 'A4', printBackground: true });
    return file;
  },
  async eval(...js) {
    return JSON.stringify(await page.evaluate(js.join(' ')));
  },
  async errors() {
    return errors.length ? errors.join('\n') : '(no console errors)';
  },
  async quit() {
    await browser.close();
    process.exit(0);
  },
};

console.log(`DRIVER READY ${browserName} ${BASE} shots=${SHOTS}`);

const rl = createInterface({ input: process.stdin });
for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [name, ...args] = trimmed.split(/\s+/);
  const fn = commands[name];
  if (!fn) {
    console.log(`err unknown command: ${name} (have: ${Object.keys(commands).join(', ')})`);
    continue;
  }
  try {
    const out = await fn(...args);
    if (out !== undefined) console.log(out);
    console.log('ok');
  } catch (e) {
    console.log(`err ${e.message}`);
  }
}

await browser.close();
