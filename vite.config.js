import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.test.js'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: { main: './index.html' },
    },
  },
})
