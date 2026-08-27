import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@optics/bench': `${here}../bench/src/index.ts`,
      '@optics/kernel': `${here}../kernel/src/index.ts`,
    },
  },
});
