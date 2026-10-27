import { readdirSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Firefox delivers input to the wrong page when one browser has several open at once: a
// click from one test file landed in the middle of another's drag, and the click that file
// asked for never arrived. Every gesture test failed at random for it. The pages already
// run in separate content processes, so the leak is in the browser process they share —
// which is why the files are dealt out across several Firefox browsers instead, each
// running one file at a time. Read off the directory, so a new spec can never be left out.
const FIREFOXES = 3;
const specs = readdirSync('tests/browser')
  .filter((file) => file.endsWith('.spec.tsx'))
  .sort();

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    dir: 'tests/browser',
    setupFiles: ['./vitest.browser.setup.ts'],
    // A page turn takes about 700ms to land, and most of what this suite polls for is the
    // paper coming down. Vitest's default budget of 1000ms left a turn 300ms of slack, which
    // a CI runner sharing its cores between four browsers did not always have. A poll
    // that passes returns at once, so this only changes how long a real failure takes.
    expect: { poll: { timeout: 3000 } },
    browser: {
      enabled: true,
      // Pinned rather than inherited: it decides whether the suite reads the issue as a
      // spread or one leaf at a time, which is a property of the tests, not of Vitest.
      viewport: { width: 414, height: 896 },
      provider: playwright(),
      // https://vitest.dev/config/browser/playwright
      instances: [
        { browser: 'chromium' },
        ...Array.from({ length: FIREFOXES }, (_, shard) => ({
          browser: 'firefox' as const,
          name: `firefox-${shard + 1}`,
          fileParallelism: false,
          // Relative to `dir`, so a bare path would look for tests/browser/tests/browser.
          include: specs
            .filter((_, index) => index % FIREFOXES === shard)
            .map((file) => `**/${file}`),
        })),
      ],
    },
  },
});
