import { describe, expect, it } from 'vitest'
import { getErrorMessage, isChunkLoadFailure } from './chunkLoadFailure'

describe('chunkLoadFailure helpers', () => {
    describe('getErrorMessage', () => {
        it('returns string errors unchanged', () => {
            expect(getErrorMessage('plain string error')).toBe('plain string error')
        })

        it('returns Error.message for Error instances', () => {
            expect(getErrorMessage(new Error('boom'))).toBe('boom')
        })

        it('returns the message field from plain objects', () => {
            expect(getErrorMessage({ message: 'object message' })).toBe(
                'object message'
            )
        })

        it('returns an empty string for unsupported values', () => {
            expect(getErrorMessage(null)).toBe('')
            expect(getErrorMessage(undefined)).toBe('')
            expect(getErrorMessage(42)).toBe('')
            expect(getErrorMessage({})).toBe('')
        })

        it('returns an empty string when the message field is nullish', () => {
            expect(getErrorMessage({ message: undefined })).toBe('')
            expect(getErrorMessage({ message: null })).toBe('')
        })
    })

    describe('isChunkLoadFailure', () => {
        it('detects known chunk-load failure messages', () => {
            expect(
                isChunkLoadFailure(
                    new Error('Failed to fetch dynamically imported module')
                )
            ).toBe(true)

            expect(
                isChunkLoadFailure({ message: 'ChunkLoadError: Loading chunk 5 failed' })
            ).toBe(true)

            expect(
                isChunkLoadFailure('Importing a module script failed')
            ).toBe(true)
        })

        it('returns false for unrelated errors', () => {
            expect(isChunkLoadFailure(new Error('Validation failed'))).toBe(false)
            expect(isChunkLoadFailure({ message: 'Network timeout' })).toBe(false)
            expect(isChunkLoadFailure({})).toBe(false)
        })
    })
})
