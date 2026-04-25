import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { marked } from 'marked'

const OUTPUT_FILENAME = 'ethical-use-license.html'

function buildHtml(mdFilePath: string): string {
    const md = readFileSync(mdFilePath, 'utf-8')
    const body = marked.parse(md, { async: false })
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ethical Use License (EUL) v1.0 — Photoview</title>
    <style>
        :root { color-scheme: light dark; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1.5rem 4rem;
            line-height: 1.7;
            color: light-dark(#1a1a1a, #e8e8e8);
            background: light-dark(#ffffff, #1e2227);
        }
        h1 { font-size: 1.75rem; border-bottom: 2px solid light-dark(#e0e0e0, #444); padding-bottom: 0.5rem; }
        h2 { font-size: 1.2rem; margin-top: 2rem; color: light-dark(#2a5ba8, #6fa3ef); }
        hr { border: none; border-top: 1px solid light-dark(#e0e0e0, #444); margin: 1.5rem 0; }
        ul { padding-left: 1.5rem; }
        li { margin-bottom: 0.4rem; }
        strong { color: light-dark(#b91c1c, #f87171); }
        a { color: light-dark(#1d4ed8, #60a5fa); }
        p:last-child { text-align: center; font-size: 1.5rem; }
    </style>
</head>
<body>
${body}
</body>
</html>`
}

export function ethicalLicensePlugin(): Plugin {
    let mdFilePath: string

    return {
        name: 'ethical-license-html',

        configResolved(config) {
            // config.root is the absolute path to ui/
            mdFilePath = resolve(config.root, '../ETHICAL_USE_LICENSE.md')
        },

        // Dev server: serve the generated HTML on-the-fly
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url?.endsWith(`/${OUTPUT_FILENAME}`)) {
                    try {
                        const html = buildHtml(mdFilePath)
                        res.setHeader('Content-Type', 'text/html; charset=utf-8')
                        res.end(html)
                    } catch (e) {
                        next(e)
                    }
                } else {
                    next()
                }
            })
        },

        // Build: emit the file directly into dist/
        generateBundle() {
            const html = buildHtml(mdFilePath)
            this.emitFile({
                type: 'asset',
                fileName: OUTPUT_FILENAME,
                source: html,
            })
        },
    }
}
