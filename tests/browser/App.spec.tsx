import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import App from '../../src/App';

test('counter button increments the count', async () => {
  const screen = await render(<App />);

  await expect.element(screen.getByText('Count is 0')).toBeVisible();
  await screen.getByRole('button').click();
  await expect.element(screen.getByText('Count is 1')).toBeVisible();
});
