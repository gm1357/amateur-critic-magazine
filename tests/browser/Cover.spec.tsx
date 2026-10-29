import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { folioOf } from './issue';

function renderCover() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

test('cover shows the magazine title and author', async () => {
  const screen = await renderCover();

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('The Weekend Critic');
  await expect.element(screen.getByText('by Gabriel Machado')).toBeVisible();
});

test('cover prints the monogram as a watermark behind the type', async () => {
  const screen = await renderCover();
  const title = screen.getByRole('heading', { level: 1 });
  await expect.element(title).toBeVisible();

  const leaf = screen.container.querySelector('[data-page="/"]')!;
  const mark = leaf.querySelector('svg')!;
  expect(mark.getAttribute('aria-hidden')).toBe('true');

  // Out of flow, so the cover's type is laid out as if it were not there.
  expect(title.element().previousElementSibling!.textContent).toBe('Issue No. 1');

  // Faint, and under the type rather than over it.
  const style = getComputedStyle(mark);
  expect(Number(style.opacity)).toBeLessThan(0.5);
  expect(style.zIndex).toBe('-1');

  // Centred on the paper, and large enough to read as a mark rather than an icon.
  const page = leaf.getBoundingClientRect();
  const box = mark.getBoundingClientRect();
  expect(box.width).toBeGreaterThan(page.width / 2);
  expect(box.left + box.width / 2).toBeCloseTo(page.left + page.width / 2, 0);
  expect(box.top + box.height / 2).toBeCloseTo(page.top + page.height / 2, 0);
});

test('cover is page one and has nothing before it', async () => {
  const screen = await renderCover();

  await expect.poll(() => folioOf(screen.container)).toBe('1');
  expect(screen.getByRole('link', { name: 'Previous' }).elements()).toHaveLength(0);
});
