/// <reference types="vitest" />

import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(async ({ command, mode }) => {
  // Conditionally import codecov plugin only if it's installed
  let codecovVitePlugin = null
  try {
    const codecovModule = await import('@codecov/vite-plugin')
    codecovVitePlugin = codecovModule.codecovVitePlugin
  } catch (e) {
    // Plugin not installed (production build), skip it
  }

  return {
    plugins: [
      react(),
      svgr(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'service-worker.ts',
        injectRegister: 'script',
        manifest: false,
        injectManifest: {
          injectionPoint: undefined
        }
      }),
      // Only add codecov plugin if it's available
      codecovVitePlugin && codecovVitePlugin({
        enableBundleAnalysis: process.env.CODECOV_TKN !== undefined,
        telemetry: false,
        gitService: "github",
        bundleName: "Photoview-UI-bundle",
        uploadToken: process.env.CODECOV_TKN,
        debug: true,
      }),
    ].filter(Boolean), // Remove falsy values from plugins array
    envPrefix: ['VITE_', 'REACT_APP_'],
    server: {
      port: 1234,
    },
    esbuild: {
      target: 'es2020', // Ensure compatibility with browsers, not older than from 2021
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './testing/setupTests.ts',
      reporters: ['tree', 'junit'],
      outputFile: {
        junit: './junit-report.xml',
      },
      coverage: {
        reporter: ['text', 'lcov', 'json', 'html'],
        reportOnFailure: true,
      },
    },
  }
})
