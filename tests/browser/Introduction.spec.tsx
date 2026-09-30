import { render } from 'vitest-browser-react';
import { expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import App from '../../src/App';
import { MAGAZINE_TITLE } from '../../src/magazine';
import { CONTENTS_PATH, INTRODUCTION_PATH } from '../../src/pages';
import { folioOf, openAt } from './issue';

function renderIntroduction() {
  return render(
    <MemoryRouter initialEntries={[INTRODUCTION_PATH]}>
      <App />
    </MemoryRouter>,
  );
}

// The leaf on the desk, never one being counted in the composing room.
function leafOf(container: HTMLElement): HTMLElement {
  return container.querySelector(`[data-spread] [data-page="${INTRODUCTION_PATH}"]`)!;
}

test('the introduction sets its heading and three paragraphs of copy', async () => {
  const screen = await renderIntroduction();

  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Introduction');

  const body = [...leafOf(screen.container).querySelectorAll('article > div > p')];
  expect(body).toHaveLength(3);
  expect(body[0].textContent).toMatch(/^Lorem ipsum/);
  for (const paragraph of body) expect(paragraph.textContent?.trim()).not.toBe('');
});

// It follows the listing, so it is past the cover and at least one leaf of contents — and
// it is a page of the issue proper, with the running head, folio and bookmark that implies.
test('the introduction follows the contents and carries the magazine chrome', async () => {
  const screen = await renderIntroduction();

  await expect.element(screen.getByRole('link', { name: 'Go to contents' })).toBeVisible();
  const leaf = leafOf(screen.container);
  const folio = folioOf(screen.container);

  expect(Number(folio)).toBeGreaterThan(2);
  expect(leaf.querySelector(':scope > header')?.textContent).toBe(MAGAZINE_TITLE);
  expect(leaf.querySelector(':scope > p.tabular-nums')?.textContent).toBe(folio);
});

test('turning back from the introduction lands on the end of the listing', async () => {
  const screen = await renderIntroduction();
  await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Introduction');

  await screen.getByRole('link', { name: 'Previous' }).click();

  // However many leaves the listing took, the one behind the introduction is its last.
  await expect
    .poll(() => openAt(screen.container))
    .toEqual([expect.stringMatching(new RegExp(`^${CONTENTS_PATH}(/\\d+)?$`))]);
});
