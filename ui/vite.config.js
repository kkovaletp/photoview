/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { compression } from 'vite-plugin-compression2'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [
    react(),
    svgr(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectRegister: 'auto',
      manifest: false,
      injectManifest: {
        injectionPoint: undefined
      }
    }),
    ...(isProd
      ? [
        compression({
          algorithms: ['gzip', 'brotliCompress'],
          include: /\.(js|mjs|json|css|html|svg|txt|xml|wasm)$/i,
          exclude: /\.(jpe?g|png|gif|webp|avif|mp4|mp3|woff2?)$/i
        })
      ]
      : [])
  ],
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: {
    port: 1234,
  },
  esbuild: {
    target: 'es2017', // Ensure compatibility with browsers, not older than 2018
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './testing/setupTests.ts',
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './junit-report.xml',
    },
    coverage: {
      reporter: ['text', 'lcov', 'json', 'html'],
    },
  },
})
