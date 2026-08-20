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
