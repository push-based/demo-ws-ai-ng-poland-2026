import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const steps = ['0-start', '1-availability', '2-session', '3-streaming', '4-classify', '5-production'];

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ['index', resolve(__dirname, 'index.html')],
        ...steps.map((s) => [s, resolve(__dirname, `steps/${s}/index.html`)]),
      ]),
    },
  },
});
