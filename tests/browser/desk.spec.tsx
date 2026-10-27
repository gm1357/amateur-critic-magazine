import { render } from 'vitest-browser-react';
import { afterEach, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { DESKS } from '../../src/desk';
import { folioOf, totalOf } from './issue';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

// The choice is remembered per browser, which would otherwise carry from one test into the
// next.
afterEach(() => {
  localStorage.clear();
});

function deskOf(container: HTMLElement): HTMLElement {
  const desk = container.querySelector<HTMLElement>('.magazine-desk');
  if (!desk) throw new Error('no desk was rendered');
  return desk;
}

// Relative luminance, near enough: the question is only ever "light or dark".
function lightness(color: string): number {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

test('the reader is offered every desk, and the magazine starts on walnut', async () => {
  const screen = await renderAt('/');
  const picker = screen.getByRole('combobox', { name: 'Desk' });
  await expect.element(picker).toBeVisible();

  const options = [...picker.element().querySelectorAll('option')].map((o) => o.textContent);
  expect(options).toEqual(DESKS.map((desk) => desk.label));
  await expect.element(picker).toHaveValue('walnut');

  const desk = deskOf(screen.container);
  expect(desk.dataset.desk).toBe('walnut');
  expect(getComputedStyle(desk).backgroundImage).toContain('url(');
});

test('choosing black takes the wood away and leaves a plain dark desk', async () => {
  const screen = await renderAt('/');
  const picker = screen.getByRole('combobox', { name: 'Desk' });

  await userEvent.selectOptions(picker, 'Black');

  const desk = deskOf(screen.container);
  await expect.poll(() => desk.dataset.desk).toBe('black');
  expect(getComputedStyle(desk).backgroundImage.replace(/none,?\s*/g, '')).toBe('');
  expect(lightness(getComputedStyle(desk).backgroundColor)).toBeLessThan(0.1);
});

test('the desk the reader chose is still there when they come back', async () => {
  const first = await renderAt('/');
  await userEvent.selectOptions(first.getByRole('combobox', { name: 'Desk' }), 'Black');
  await expect.poll(() => deskOf(first.container).dataset.desk).toBe('black');
  await first.unmount();

  const again = await renderAt('/');
  await expect.element(again.getByRole('combobox', { name: 'Desk' })).toHaveValue('black');
  expect(deskOf(again.container).dataset.desk).toBe('black');
});

// The arrow keys turn the page from anywhere on the desk, but a select is a control that
// answers them itself.
test('arrow keys on the picker do not turn the page', async () => {
  const screen = await renderAt('/');
  await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
  const before = folioOf(screen.container);

  screen.getByRole('combobox', { name: 'Desk' }).element().focus();
  await userEvent.keyboard('{ArrowRight}');

  expect(folioOf(screen.container)).toBe(before);
});

// The desk is not the paper. A change of table is a change of background and nothing else:
// if it ever renumbered the issue, it would have leaked into what a leaf measures.
test('changing the desk does not re-typeset the issue', async () => {
  const screen = await renderAt('/contents');
  await expect.element(screen.getByRole('heading', { level: 1, name: 'Contents' })).toBeVisible();
  const total = totalOf(screen.container);
  const folio = folioOf(screen.container);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Desk' }), 'Black');
  await expect.poll(() => deskOf(screen.container).dataset.desk).toBe('black');

  expect(totalOf(screen.container)).toBe(total);
  expect(folioOf(screen.container)).toBe(folio);
});

// It floats in the corner rather than taking room from the leaf, so on a phone — where the
// book is as wide as the screen — it has to find bare desk above the paper.
test('the picker stands in the top right corner, clear of the book', async () => {
  const screen = await renderAt('/');
  const picker = screen.getByRole('combobox', { name: 'Desk' });
  await expect.element(picker).toBeVisible();

  const box = picker.element().getBoundingClientRect();
  const book = screen.container.querySelector('.magazine-book')!.getBoundingClientRect();
  const gutter = parseFloat(getComputedStyle(document.documentElement).fontSize);

  expect(window.innerWidth - box.right).toBeCloseTo(gutter, 0);
  expect(box.top).toBeCloseTo(gutter, 0);

  const overlaps =
    box.left < book.right &&
    box.right > book.left &&
    box.top < book.bottom &&
    box.bottom > book.top;
  expect(overlaps).toBe(false);
});
