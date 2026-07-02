/**
 * Trims whitespace and returns null when the result is empty.
 * Use for optional label/title fields so a blank value shows the "Unlabeled" fallback.
 */
export const normalizeLabel = (
    input: string | null | undefined
): string | null => {
    const v = (input ?? '').trim()
    return v === '' ? null : v
}

/** Trims leading/trailing whitespace from a username. */
export const normalizeUsername = (input: string): string =>
    (input ?? '').trim()

/** Trims leading/trailing whitespace from a filesystem path. */
export const normalizePath = (input: string): string =>
    (input ?? '').trim()
