import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: { panel: 'panel.html', background: 'src/background.ts' },
      output: {
        entryFileNames: chunk => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
})
