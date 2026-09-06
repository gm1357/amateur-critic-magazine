import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, reviewPath } from '../../src/pages';
import { folioOf, openAt, totalOf } from './issue';

const first = reviews[0];

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
  await expect.poll(() => folioOf(screen.container)).toBe('2');
});

// The contents runs to whatever length it runs to, so what follows it is "more contents
// until there is no more of it" rather than a page number written down here.
test('paging on from the contents reaches the first review', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const next = screen.getByRole('link', { name: 'Next' });
  const opens = reviewPath(first.slug);

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contents');

  const passed: string[] = [];
  for (let turn = 0; turn < 12 && !openAt(screen.container).includes(opens); turn++) {
    const open = openAt(screen.container);
    passed.push(...open);

    await next.click();
    await expect.poll(() => openAt(screen.container)).not.toEqual(open);
  }

  // Every page between the two is more of the contents — the review is reached by reading
  // through the listing, not by skipping the rest of it.
  expect(passed.every((page) => page.startsWith(CONTENTS_PATH))).toBe(true);
  expect(passed.length).toBeGreaterThan(0);

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent(first.movie);
  await expect.element(screen.getByRole('img', { name: `${first.score} out of 10` })).toBeVisible();
});

test('the right arrow key turns the page', async () => {
  const screen = await renderAt(CONTENTS_PATH);

  // The listener is on window, so nothing needs focus first.
  await userEvent.keyboard('{ArrowRight}');

  await expect.poll(() => folioOf(screen.container)).toBe('3');
});

test('the left arrow key turns back to the cover', async () => {
  const screen = await renderAt('/');

  await userEvent.keyboard('{ArrowRight}');
  await expect.poll(() => folioOf(screen.container)).toBe('2');

  await userEvent.keyboard('{ArrowLeft}');

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('Amateur Critic Magazine');
  await expect.poll(() => folioOf(screen.container)).toBe('1');
});

test('paging back from the cover does nothing', async () => {
  const screen = await renderAt('/');

  await userEvent.keyboard('{ArrowLeft}');

  await expect.poll(() => folioOf(screen.container)).toBe('1');
});

test('paging forward from the back cover does nothing', async () => {
  const screen = await renderAt(BACK_PATH);
  const total = totalOf(screen.container);

  await expect.poll(() => folioOf(screen.container)).toBe(String(total));

  await userEvent.keyboard('{ArrowRight}');

  await expect
    .element(screen.getByRole('heading', { level: 1 }))
    .toHaveTextContent('Amateur Critic Magazine');
  expect(folioOf(screen.container)).toBe(String(total));
});
