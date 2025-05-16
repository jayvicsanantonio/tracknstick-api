import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        ENVIRONMENT: 'test',
      },
      // Uncomment to enable KV storage for tests
      // kvNamespaces: ['CACHE'],
    },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
    testTimeout: 10000,
  },
});
