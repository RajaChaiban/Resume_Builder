import { defineConfig } from 'vitest/config';

// Node environment is enough — the only unit tests cover pure logic (region
// triage). Component rendering is verified visually in the browser.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
