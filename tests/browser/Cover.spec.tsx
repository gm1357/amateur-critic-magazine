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

test('cover prints the monogram between the issue number and the title', async () => {
  const screen = await renderCover();
  const title = screen.getByRole('heading', { level: 1 });
  await expect.element(title).toBeVisible();

  const mark = title.element().previousElementSibling!;
  expect(mark.tagName).toBe('svg');
  expect(mark.getAttribute('aria-hidden')).toBe('true');
  expect(mark.previousElementSibling!.textContent).toBe('Issue No. 1');

  // Set large: a fifth of the cover's width, not an icon dropped onto it.
  const leaf = mark.closest('.a4-leaf')!.getBoundingClientRect();
  expect(mark.getBoundingClientRect().width).toBeGreaterThan(leaf.width / 5);
});

test('cover is page one and has nothing before it', async () => {
  const screen = await renderCover();

  await expect.poll(() => folioOf(screen.container)).toBe('1');
  expect(screen.getByRole('link', { name: 'Previous' }).elements()).toHaveLength(0);
});
