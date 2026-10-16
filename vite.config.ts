/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Our own Workbox service worker (src/sw.ts) gets the precache manifest injected at build time.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // The manifest lives in public/manifest.json and is linked from index.html.
      manifest: false,
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,json,woff2}'],
        // Precache only Latin font subsets (Latin Extended covers Yoruba, Igbo, Hausa and
        // European diacritics); other scripts still load on demand when online.
        globIgnores: [
          '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,math,symbols}-*.woff2',
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Full-app tests render all cards; give them headroom on slow CI runners.
    testTimeout: 20000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/calculators/**/*.ts'],
      exclude: ['src/calculators/index.ts', 'src/calculators/__tests__/**'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
