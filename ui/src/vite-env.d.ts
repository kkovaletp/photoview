/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

import 'react-router'

declare module 'react-router' {
    interface NavigateFunction {
        (to: To, options?: NavigateOptions): void
        (delta: number): void
    }
}
