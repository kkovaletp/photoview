import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { Plugin, ResolvedConfig } from 'vite'

// Explicit minimal factory — avoids the importOriginal/spread issue with node:fs CJS interop.
vi.mock('node:fs', () => {
    const existsSync = vi.fn()
    const readdirSync = vi.fn()
    const readFileSync = vi.fn()
    return {
        default: { existsSync, readdirSync, readFileSync },
        existsSync,
        readdirSync,
        readFileSync,
    }
})

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { ethicalLicensePlugin } from './ethicalLicensePlugin'

// ─── typed mock handles ───────────────────────────────────────────────────────
const mockedExistsSync = vi.mocked(existsSync)
const mockedReaddirSync = vi.mocked(readdirSync)
const mockedReadFileSync = vi.mocked(readFileSync)

// ─── path constants ───────────────────────────────────────────────────────────
// config.root  → UI_ROOT  → repoRoot = UI_ROOT/..
// The fake absolute root /app/ui is chosen because it cannot exist on any
// real machine, guaranteeing that no accidental real-fs reads can occur.
const UI_ROOT = '/app/ui'
const REPO_ROOT = '/app'
const LOCALES_DIR = `${REPO_ROOT}/ui/lic-locales`
const ROOT_LICENSE = `${REPO_ROOT}/ETHICAL_USE_LICENSE.md`

const localeLicensePath = (lang: string) =>
    `${LOCALES_DIR}/${lang}/ETHICAL_USE_LICENSE.md`

// ─── test-only helpers ────────────────────────────────────────────────────────

/** Creates a minimal Dirent-shaped object used by readdirSync mocks. */
function fakeDirent(
    name: string,
    opts: { dir?: boolean; symlink?: boolean } = {},
) {
    return {
        name,
        isDirectory: () => opts.dir ?? true,
        isSymbolicLink: () => opts.symlink ?? false,
    }
}

/** Builds a fresh plugin instance and runs configResolved with a fake config. */
function buildPlugin(uiRoot = UI_ROOT): Required<Plugin> {
    const plugin = ethicalLicensePlugin() as Required<Plugin>
        ; (plugin.configResolved as (c: unknown) => void)({ root: uiRoot } as ResolvedConfig)
    return plugin
}

/**
 * Wires up a mock ViteDevServer, calls configureServer, and returns the
 * connect-style middleware that was registered via server.middlewares.use().
 */
function captureMiddleware(plugin: Required<Plugin>) {
    let captured!: (req: any, res: any, next: () => void) => void
        ; (plugin.configureServer as (s: unknown) => void)({
            middlewares: {
                use: (fn: typeof captured) => { captured = fn },
            },
        })
    return captured
}

/** Minimal mock of a Node ServerResponse, recording headers and body. */
function makeRes() {
    return {
        statusCode: 200 as number,
        _headers: {} as Record<string, string>,
        _body: undefined as string | undefined,
        setHeader(key: string, value: string) { this._headers[key] = value },
        end(body: string) { this._body = body },
    }
}

/**
 * Calls generateBundle with a mock Rollup plugin context and returns all
 * assets that were emitted via this.emitFile().
 */
function callGenerateBundle(plugin: Required<Plugin>) {
    const emitted: Array<{ fileName: string; source: string }> = []
    const ctx = {
        emitFile: vi.fn(
            (file: { type: string; fileName: string; source: string }) => {
                emitted.push({ fileName: file.fileName, source: file.source })
                return ''
            },
        ),
    }
        ; (plugin.generateBundle as Function).call(ctx, {}, {}, false)
    return emitted
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ethicalLicensePlugin', () => {
    beforeEach(() => {
        // Wipe all mock state (return values + call history) before each test.
        vi.resetAllMocks()
    })

    // ── configResolved ──────────────────────────────────────────────────────────
    describe('configResolved', () => {
        test('plugin name is "ethical-license-assets"', () => {
            expect(ethicalLicensePlugin().name).toBe('ethical-license-assets')
        })

        test('derives repoRoot one directory above config.root', () => {
            // existsSync is called inside generateBundle → getAvailableLocales,
            // which is the first hook that actually uses repoRoot.
            // All mocks return false/[] so locales = [] — we only care about
            // which paths existsSync was called with.
            mockedExistsSync.mockReturnValue(false)
            mockedReaddirSync.mockReturnValue([] as any)

            const plugin = buildPlugin('/custom/ui')
            callGenerateBundle(plugin)

            const calledPaths = mockedExistsSync.mock.calls.map(c => String(c[0]))
            // repoRoot should be /custom (one level above /custom/ui)
            expect(calledPaths.some(p => p.startsWith('/custom/'))).toBe(true)
            // Should never reference the default /app path
            expect(calledPaths.some(p => p.startsWith('/app/'))).toBe(false)
        })
    })

    // ── getAvailableLocales ─────────────────────────────────────────────────────
    describe('getAvailableLocales', () => {
        test('returns empty list when the locales dir does not exist and there is no root license', () => {
            mockedExistsSync.mockReturnValue(false)

            const { locales } = JSON.parse(callGenerateBundle(buildPlugin())[0].source)
            expect(locales).toEqual([])
        })

        test('returns ["en"] when only the repo-root license file exists', () => {
            mockedExistsSync.mockImplementation(p => String(p) === ROOT_LICENSE)

            const { locales } = JSON.parse(callGenerateBundle(buildPlugin())[0].source)
            expect(locales).toEqual(['en'])
        })

        test('includes locales for directory entries whose MD file exists', () => {
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return (
                    s === LOCALES_DIR ||
                    s === localeLicensePath('de') ||
                    s === localeLicensePath('fr')
                )
            })
            mockedReaddirSync.mockReturnValue([
                fakeDirent('de'),
                fakeDirent('fr'),
            ] as any)

            const { locales } = JSON.parse(callGenerateBundle(buildPlugin())[0].source)
            expect(locales).toEqual(['de', 'fr'])
        })

        test('includes locales from symlink directory entries', () => {
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('en')
            })
            mockedReaddirSync.mockReturnValue([
                fakeDirent('en', { dir: false, symlink: true }),
            ] as any)

            const { locales } = JSON.parse(callGenerateBundle(buildPlugin())[0].source)
            expect(locales).toContain('en')
        })

        test('excludes entries whose MD file does not exist', () => {
            // Dir exists and has an entry 'de', but de/ETHICAL_USE_LICENSE.md does not.
            mockedExistsSync.mockImplementation(p => String(p) === LOCALES_DIR)
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)

            const { locales } = JSON.parse(callGenerateBundle(buildPlugin())[0].source)
            expect(locales).not.toContain('de')
        })

        test('deduplicates "en" when lic-locales/en/ and the root license both exist', () => {
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return (
                    s === LOCALES_DIR ||
                    s === localeLicensePath('en') ||
                    s === ROOT_LICENSE
                )
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('en')] as any)

            const { locales } = JSON.parse(callGenerateBundle(buildPlugin())[0].source)
            expect(locales.filter((l: string) => l === 'en')).toHaveLength(1)
        })

        test('returns locales in ascending alphabetical order', () => {
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return (
                    s === LOCALES_DIR ||
                    s === localeLicensePath('uk') ||
                    s === localeLicensePath('de') ||
                    s === localeLicensePath('fr') ||
                    s === ROOT_LICENSE
                )
            })
            mockedReaddirSync.mockReturnValue([
                fakeDirent('uk'),
                fakeDirent('de'),
                fakeDirent('fr'),
            ] as any)

            const { locales } = JSON.parse(callGenerateBundle(buildPlugin())[0].source)
            expect(locales).toEqual(['de', 'en', 'fr', 'uk'])
        })
    })

    // ── readLicenseMd ───────────────────────────────────────────────────────────
    describe('readLicenseMd', () => {
        test('returns the locale-specific file content when it exists and is readable', () => {
            const DE_MD = '# Ethical Use License — DE'
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('de')
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)
            mockedReadFileSync.mockImplementation(p => {
                if (String(p) === localeLicensePath('de')) return DE_MD as any
                throw new Error('ENOENT')
            })

            const emitted = callGenerateBundle(buildPlugin())
            const deFile = emitted.find(f => f.fileName.endsWith('de/ETHICAL_USE_LICENSE.md'))
            expect(deFile?.source).toBe(DE_MD)
        })

        test('falls back to the root license when the locale file cannot be read (via configureServer)', () => {
            const EN_MD = '# Ethical Use License — EN'
            // existsSync returns false for the locale file but true for root license
            mockedExistsSync.mockImplementation(p => String(p) === ROOT_LICENSE)
            mockedReadFileSync.mockImplementation(p => {
                if (String(p) === ROOT_LICENSE) return EN_MD as any
                throw new Error('ENOENT')
            })

            const plugin = buildPlugin()
            const mw = captureMiddleware(plugin)
            const res = makeRes()

            mw({ url: '/assets/lic-locales/xx/ETHICAL_USE_LICENSE.md' }, res, vi.fn())

            expect(res._body).toBe(EN_MD)
            expect(res._headers['Content-Type']).toBe('text/markdown; charset=utf-8')
        })

        test('falls back to the root license when readFileSync throws for the locale file', () => {
            const EN_MD = '# Ethical Use License — EN (fallback)'
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('de') || s === ROOT_LICENSE
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)
            mockedReadFileSync.mockImplementation(p => {
                const s = String(p)
                if (s === localeLicensePath('de')) throw new Error('Permission denied')
                if (s === ROOT_LICENSE) return EN_MD as any
                throw new Error('ENOENT')
            })

            const emitted = callGenerateBundle(buildPlugin())
            const deFile = emitted.find(f => f.fileName.endsWith('de/ETHICAL_USE_LICENSE.md'))
            expect(deFile?.source).toBe(EN_MD)
        })

        test('returns null and the asset is omitted when both locale and root reads fail', () => {
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('de')
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)
            mockedReadFileSync.mockImplementation(() => { throw new Error('ENOENT') })

            const emitted = callGenerateBundle(buildPlugin())
            // Only the manifest should be emitted; no de/ETHICAL_USE_LICENSE.md.
            expect(emitted).toHaveLength(1)
            expect(emitted[0].fileName).toBe('assets/lic-locales/manifest.json')
        })
    })

    // ── configureServer (dev middleware) ────────────────────────────────────────
    describe('configureServer', () => {
        test('serves manifest.json with application/json content-type and locale list', () => {
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('de') || s === ROOT_LICENSE
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)

            const plugin = buildPlugin()
            const mw = captureMiddleware(plugin)
            const res = makeRes()
            const next = vi.fn()

            mw({ url: '/assets/lic-locales/manifest.json' }, res, next)

            expect(res._headers['Content-Type']).toBe('application/json; charset=utf-8')
            expect(JSON.parse(res._body!)).toEqual({ locales: ['de', 'en'] })
            expect(next).not.toHaveBeenCalled()
        })

        test('serves the MD file for a valid locale with text/markdown content-type', () => {
            const DE_MD = '# DE License'
            mockedExistsSync.mockImplementation(p => String(p) === localeLicensePath('de'))
            mockedReadFileSync.mockImplementation(p => {
                if (String(p) === localeLicensePath('de')) return DE_MD as any
                throw new Error('ENOENT')
            })

            const plugin = buildPlugin()
            const mw = captureMiddleware(plugin)
            const res = makeRes()
            const next = vi.fn()

            mw({ url: '/assets/lic-locales/de/ETHICAL_USE_LICENSE.md' }, res, next)

            expect(res._headers['Content-Type']).toBe('text/markdown; charset=utf-8')
            expect(res._body).toBe(DE_MD)
            expect(next).not.toHaveBeenCalled()
        })

        test('handles MD URLs with a query string (e.g. cache-busting)', () => {
            const EN_MD = '# EN License'
            mockedExistsSync.mockReturnValue(false)
            mockedReadFileSync.mockImplementation(p => {
                if (String(p) === ROOT_LICENSE) return EN_MD as any
                throw new Error('ENOENT')
            })

            // Make root license readable so fallback path succeeds
            mockedExistsSync.mockImplementation(p => String(p) === ROOT_LICENSE)

            const plugin = buildPlugin()
            const mw = captureMiddleware(plugin)
            const res = makeRes()

            mw({ url: '/assets/lic-locales/en/ETHICAL_USE_LICENSE.md?v=abc123' }, res, vi.fn())

            expect(res._headers['Content-Type']).toBe('text/markdown; charset=utf-8')
            expect(res._body).toBe(EN_MD)
        })

        test('responds with 404 when the requested locale file cannot be resolved', () => {
            // Both locale path and root license are inaccessible
            mockedExistsSync.mockReturnValue(false)
            mockedReadFileSync.mockImplementation(() => { throw new Error('ENOENT') })

            const plugin = buildPlugin()
            const mw = captureMiddleware(plugin)
            const res = makeRes()
            const next = vi.fn()

            mw({ url: '/assets/lic-locales/xx/ETHICAL_USE_LICENSE.md' }, res, next)

            expect(res.statusCode).toBe(404)
            expect(res._body).toBe('License file not found')
            expect(next).not.toHaveBeenCalled()
        })

        test('calls next() for unrelated URLs', () => {
            mockedExistsSync.mockReturnValue(false)

            const plugin = buildPlugin()
            const mw = captureMiddleware(plugin)

            for (const url of ['/index.html', '/api/graphql', '/assets/other.js']) {
                const next = vi.fn()
                mw({ url }, makeRes(), next)
                expect(next).toHaveBeenCalledOnce()
            }
        })

        test('calls next() when req.url is undefined', () => {
            mockedExistsSync.mockReturnValue(false)

            const plugin = buildPlugin()
            const mw = captureMiddleware(plugin)
            const next = vi.fn()

            mw({ url: undefined }, makeRes(), next)

            expect(next).toHaveBeenCalledOnce()
        })
    })

    // ── generateBundle (production build) ──────────────────────────────────────
    describe('generateBundle', () => {
        test('always emits assets/lic-locales/manifest.json as the first asset', () => {
            mockedExistsSync.mockReturnValue(false)

            const emitted = callGenerateBundle(buildPlugin())

            expect(emitted[0].fileName).toBe('assets/lic-locales/manifest.json')
        })

        test('emits one MD file per available locale at the correct path', () => {
            const DE_MD = '# DE'
            const EN_MD = '# EN'
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('de') || s === ROOT_LICENSE
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)
            mockedReadFileSync.mockImplementation(p => {
                const s = String(p)
                if (s === localeLicensePath('de')) return DE_MD as any
                if (s === ROOT_LICENSE) return EN_MD as any
                throw new Error('ENOENT')
            })

            const emitted = callGenerateBundle(buildPlugin())

            // manifest + de + en = 3 emitted assets
            expect(emitted).toHaveLength(3)
            expect(
                emitted.find(f => f.fileName === 'assets/lic-locales/de/ETHICAL_USE_LICENSE.md')?.source,
            ).toBe(DE_MD)
            expect(
                emitted.find(f => f.fileName === 'assets/lic-locales/en/ETHICAL_USE_LICENSE.md')?.source,
            ).toBe(EN_MD)
        })

        test('does not emit an MD asset for a locale whose content cannot be read', () => {
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('de')
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)
            mockedReadFileSync.mockImplementation(() => { throw new Error('ENOENT') })

            const emitted = callGenerateBundle(buildPlugin())

            // Only the manifest; 'de' is skipped because readLicenseMd returned null.
            expect(emitted).toHaveLength(1)
            expect(emitted.every(f => !f.fileName.includes('/de/'))).toBe(true)
        })

        test('includes the locale in the manifest even when its MD asset cannot be emitted', () => {
            // getAvailableLocales deems 'de' valid (existsSync returns true for its MD path),
            // but readFileSync fails → readLicenseMd returns null → no asset, but manifest is correct.
            mockedExistsSync.mockImplementation(p => {
                const s = String(p)
                return s === LOCALES_DIR || s === localeLicensePath('de')
            })
            mockedReaddirSync.mockReturnValue([fakeDirent('de')] as any)
            mockedReadFileSync.mockImplementation(() => { throw new Error('ENOENT') })

            const emitted = callGenerateBundle(buildPlugin())

            const { locales } = JSON.parse(emitted[0].source)
            expect(locales).toContain('de')
        })
    })
})
