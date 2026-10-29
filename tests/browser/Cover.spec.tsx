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

test('cover is page one and has nothing before it', async () => {
  const screen = await renderCover();

  await expect.poll(() => folioOf(screen.container)).toBe('1');
  expect(screen.getByRole('link', { name: 'Previous' }).elements()).toHaveLength(0);
});
