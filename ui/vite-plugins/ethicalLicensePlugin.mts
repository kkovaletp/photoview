import type { Plugin } from 'vite'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_LOCALES_DIR = 'ui/lic-locales'
const ASSET_URL_PATH = 'assets/lic-locales'
const LICENSE_FILE = 'ETHICAL_USE_LICENSE.md'

/** Returns locale codes that have a translated MD file under lic-locales/. */
function getAvailableLocales(repoRoot: string): string[] {
    const dir = resolve(repoRoot, SOURCE_LOCALES_DIR)
    const locales = existsSync(dir)
        ? readdirSync(dir, { withFileTypes: true })
            .filter(e => e.isDirectory() || e.isSymbolicLink())
            .map(e => e.name)
            // Only include if the MD file actually exists (symlink or real file)
            .filter(name => existsSync(resolve(dir, name, LICENSE_FILE)))
        : []

    if (existsSync(resolve(repoRoot, LICENSE_FILE))) {
        locales.push('en')
    }

    return [...new Set(locales)].sort((a, b) => a.localeCompare(b))
}

/** Reads a locale's MD, falling back to the repo-root EN copy. */
function readLicenseMd(repoRoot: string, lang: string): string | null {
    const localePath = resolve(repoRoot, SOURCE_LOCALES_DIR, lang, LICENSE_FILE)
    if (existsSync(localePath)) {
        try { return readFileSync(localePath, 'utf-8') } catch { /* fall through */ }
    }
    // Absolute fallback: the root English copy
    const rootPath = resolve(repoRoot, LICENSE_FILE)
    try { return readFileSync(rootPath, 'utf-8') } catch { /* fall through */ }
    return null
}

export function ethicalLicensePlugin(): Plugin {
    let repoRoot: string

    return {
        name: 'ethical-license-assets',

        configResolved(config) {
            // config.root is the absolute path to ui/
            repoRoot = resolve(config.root, '..')
        },

        // Dev server: serve manifest + MD files on-the-fly
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? ''

                // GET /assets/lic-locales/manifest.json
                if (url === `/${ASSET_URL_PATH}/manifest.json`) {
                    const locales = getAvailableLocales(repoRoot)
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ locales }))
                    return
                }

                // GET /assets/lic-locales/<lang>/ETHICAL_USE_LICENSE.md
                const mdMatch = /^\/assets\/lic-locales\/([a-zA-Z-]+)\/ETHICAL_USE_LICENSE\.md(\?.*)?$/.exec(url)
                if (mdMatch) {
                    const md = readLicenseMd(repoRoot, mdMatch[1])
                    if (md === null) {
                        res.statusCode = 404
                        res.end('License file not found')
                    } else {
                        res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
                        res.end(md)
                    }
                    return
                }

                next()
            })
        },

        // Production build: emit manifest + all locale MD files as static assets
        generateBundle() {
            const locales = getAvailableLocales(repoRoot)

            this.emitFile({
                type: 'asset',
                fileName: `${ASSET_URL_PATH}/manifest.json`,
                source: JSON.stringify({ locales }),
            })

            for (const lang of locales) {
                const md = readLicenseMd(repoRoot, lang)
                if (md !== null) {
                    this.emitFile({
                        type: 'asset',
                        fileName: `${ASSET_URL_PATH}/${lang}/${LICENSE_FILE}`,
                        source: md,
                    })
                }
            }
        },
    }
}
