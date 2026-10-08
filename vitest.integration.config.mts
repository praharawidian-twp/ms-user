import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.integration.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    // Each test file owns a database; serial execution limits container usage.
    fileParallelism: false,
    maxWorkers: 1,
    sequence: { concurrent: false },
    hookTimeout: 180_000,
    testTimeout: 15_000,
    restoreMocks: true,
  },
});
