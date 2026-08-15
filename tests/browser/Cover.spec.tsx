import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';

test('cover shows the magazine title and author', async () => {
  const screen = await render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('Amateur Critic Magazine');
  await expect.element(screen.getByText('by Gabriel Machado')).toBeVisible();
});
