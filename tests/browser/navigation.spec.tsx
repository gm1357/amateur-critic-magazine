import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { reviews } from '../../src/data/reviews';
import { BACK_PATH, CONTENTS_PATH, INTRODUCTION_PATH, reviewPath } from '../../src/pages';
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

// The contents and the introduction run to whatever length they run to, so what follows the
// listing is "more of it, then the introduction" rather than a page number written down here.
test('paging on from the contents passes the introduction and reaches the first review', async () => {
  const screen = await renderAt(CONTENTS_PATH);
  const next = screen.getByRole('link', { name: 'Next' });
  const opens = reviewPath(first.slug);

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Contents');
  const book = screen.container.querySelector('[data-spread]')!;

  const passed: string[] = [];
  for (let turn = 0; turn < 12 && !openAt(screen.container).includes(opens); turn++) {
    const spread = book.getAttribute('data-spread');
    passed.push(...openAt(screen.container));

    // The spread only moves once the leaf is down. Waiting on the open pages instead would
    // catch the leaf in the air, with the page it is leaving still among them.
    await next.click();
    await expect.poll(() => book.getAttribute('data-spread')).not.toBe(spread);
  }

  // Every page between the two is the rest of the listing and then the introduction — the
  // review is reached by reading through both, not by skipping either.
  const introduction = passed.findIndex((page) => page.startsWith(INTRODUCTION_PATH));
  expect(introduction).toBeGreaterThan(0);
  expect(passed.slice(0, introduction).every((page) => page.startsWith(CONTENTS_PATH))).toBe(true);
  expect(passed.slice(introduction).every((page) => page.startsWith(INTRODUCTION_PATH))).toBe(true);

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
