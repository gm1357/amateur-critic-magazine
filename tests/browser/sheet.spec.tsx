import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';

// ISO 216: 210 x 297 mm.
const A4 = 210 / 297;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

// One test shrinks the window; the size is global to the file, so hand it back.
const viewport = { width: window.innerWidth, height: window.innerHeight };

afterEach(async () => {
  await page.viewport(viewport.width, viewport.height);
});

function sheetOf(container: HTMLElement) {
  const sheet = container.querySelector('.a4-leaf');
  if (!sheet) throw new Error('no A4 leaf was rendered');
  return sheet;
}

test('the cover is printed on a sheet of A4', async () => {
  const screen = await renderAt('/');
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const { width, height } = sheetOf(screen.container).getBoundingClientRect();

  expect(width / height).toBeCloseTo(A4, 2);
});

test('a review page is the same sheet, whole and on screen', async () => {
  const screen = await renderAt(`/reviews/${reviews[0].slug}`);
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const { width, height } = sheetOf(screen.container).getBoundingClientRect();

  expect(width / height).toBeCloseTo(A4, 2);
  // Sub-pixel slack: the sheet is sized off viewport units, which round.
  expect(width).toBeLessThanOrEqual(window.innerWidth + 1);
  expect(height).toBeLessThanOrEqual(window.innerHeight + 1);
});

test('a review too long for the page scrolls inside it rather than stretching it', async () => {
  const screen = await renderAt(`/reviews/${reviews[0].slug}`);
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  // Squeezed until the body cannot possibly fit — the paper must not grow to meet it.
  await page.viewport(420, 520);
  const sheet = sheetOf(screen.container);
  const { width, height } = sheet.getBoundingClientRect();

  expect(width / height).toBeCloseTo(A4, 2);
  expect(height).toBeLessThanOrEqual(window.innerHeight + 1);
  expect(sheet.scrollHeight).toBe(sheet.clientHeight);
});

// Relative luminance, near enough: the question is only ever "light or dark".
function lightness(color: string): number {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

test('the issue is printed dark whatever the reader’s browser prefers', async () => {
  // The suite's browsers prefer a light scheme, so this is the case the palette used to follow.
  expect(window.matchMedia('(prefers-color-scheme: light)').matches).toBe(true);

  const screen = await renderAt('/contents');
  const heading = screen.getByRole('heading', { level: 1, name: 'Contents' });
  await expect.element(heading).toBeVisible();

  const desk = screen.container.querySelector<HTMLElement>('.magazine-desk')!;
  const sheet = desk.querySelector('[data-spread] .a4-leaf')!;

  expect(getComputedStyle(document.documentElement).colorScheme).toBe('dark');
  expect(lightness(getComputedStyle(desk).backgroundColor)).toBeLessThan(0.1);
  expect(lightness(getComputedStyle(sheet).backgroundColor)).toBeLessThan(0.1);
  expect(lightness(getComputedStyle(heading.element()).color)).toBeGreaterThan(0.9);
});

// The desk is a wooden table rather than a flat fill: a warm brown under the grain, with
// the grain itself and the boards drawn over it. On paper it goes away, but that is a
// print stylesheet, which this suite does not lay out.
test('the magazine lies on a wooden table', async () => {
  const screen = await renderAt('/');
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();

  const desk = getComputedStyle(screen.container.querySelector('.magazine-desk')!);
  const [r, g, b] = desk.backgroundColor.match(/[\d.]+/g)!.map(Number);

  expect(r).toBeGreaterThan(g);
  expect(g).toBeGreaterThan(b);
  expect(desk.backgroundImage).toContain('url(');
  expect(desk.backgroundImage).toContain('repeating-linear-gradient');
});
