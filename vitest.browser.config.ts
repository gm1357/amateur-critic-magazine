import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    dir: 'tests/browser',
    setupFiles: ['./vitest.browser.setup.ts'],
    browser: {
      enabled: true,
      // Pinned rather than inherited: it decides whether the suite reads the issue as a
      // spread or one leaf at a time, which is a property of the tests, not of Vitest.
      viewport: { width: 414, height: 896 },
      provider: playwright(),
      // https://vitest.dev/config/browser/playwright
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }],
    },
  },
});
