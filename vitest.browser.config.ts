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
    // Most of what this suite waits on is a leaf coming down, and a turn takes as long as it
    // takes. The leaf in the air is eight strips each carrying both sides of a whole page, and
    // in an uncompiled build with every Chromium file running at once, mounting them alone
    // took up to a second before the turn could start — a second is Vitest's whole default.
    // A poll that passes still returns the moment it does; this is only how long a failing
    // one keeps trying.
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
