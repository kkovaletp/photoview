const CHUNK_LOAD_FAILURE_PATTERNS = [
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'chunkloaderror',
] as const

export function getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
        return error
    }

    if (error instanceof Error) {
        return error.message
    }

    if (typeof error !== 'object' || error === null) {
        return ''
    }

    if (!('message' in error)) {
        return ''
    }

    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : ''
}

export function isChunkLoadFailure(error: unknown): boolean {
    const normalizedMessage = getErrorMessage(error).toLowerCase()

    return CHUNK_LOAD_FAILURE_PATTERNS.some(pattern =>
        normalizedMessage.includes(pattern)
    )
}
