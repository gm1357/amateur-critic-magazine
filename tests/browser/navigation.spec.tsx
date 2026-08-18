import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { CONTENTS_PATH, pages } from '../../src/pages';

const total = pages.length;
const first = reviews[0];
const last = reviews[reviews.length - 1];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

test('the next link moves from the cover to the contents', async () => {
  const screen = await renderAt('/');

  await screen.getByRole('link', { name: 'Next' }).click();

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contents');
  await expect.element(screen.getByText(`2 / ${total}`)).toBeVisible();
});

test('the next link moves from the contents to the first review', async () => {
  const screen = await renderAt(CONTENTS_PATH);

  await screen.getByRole('link', { name: 'Next' }).click();

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(first.movie);
  await expect.element(screen.getByRole('img', { name: `${first.score} out of 10` })).toBeVisible();
  await expect.element(screen.getByText(`3 / ${total}`)).toBeVisible();
});

test('the right arrow key turns the page', async () => {
  const screen = await renderAt(CONTENTS_PATH);

  // The listener is on window, so nothing needs focus first.
  await userEvent.keyboard('{ArrowRight}');

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(first.movie);
  await expect.element(screen.getByText(`3 / ${total}`)).toBeVisible();
});

test('the left arrow key turns back to the cover', async () => {
  const screen = await renderAt('/');

  await userEvent.keyboard('{ArrowRight}');
  await expect.element(screen.getByText(`2 / ${total}`)).toBeVisible();

  await userEvent.keyboard('{ArrowLeft}');

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('Amateur Critic Magazine');
  await expect.element(screen.getByText(`1 / ${total}`)).toBeVisible();
});

test('paging back from the cover does nothing', async () => {
  const screen = await renderAt('/');

  await userEvent.keyboard('{ArrowLeft}');

  await expect.element(screen.getByText(`1 / ${total}`)).toBeVisible();
});

test('paging forward from the last review does nothing', async () => {
  const screen = await renderAt(`/reviews/${last.slug}`);

  await expect.element(screen.getByText(`${total} / ${total}`)).toBeVisible();

  await userEvent.keyboard('{ArrowRight}');

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(last.movie);
  await expect.element(screen.getByText(`${total} / ${total}`)).toBeVisible();
});
