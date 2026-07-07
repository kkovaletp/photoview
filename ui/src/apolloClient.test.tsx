import { describe, it, expect, beforeEach } from 'vitest'
import {
    calculateRetryDelay,
    formatPath,
    getServerErrorMessages,
    getNetworkErrorNotification,
    isAuthNetworkError,
    paginateCache,
    isLegitimateClose
} from './apolloClient'

describe('paginateCache', () => {
    let paginateFn: ReturnType<typeof paginateCache>

    beforeEach(() => {
        paginateFn = paginateCache(['testKey'])
    })

    describe('Configuration', () => {
        it('should return correct structure and preserve various keyArgs configurations', () => {
            const testCases = [
                [],
                ['single'],
                ['onlyFavorites', 'order'], // Real usage from Album.media
                ['onlyFavorites'], // Real usage from Query.myTimeline
                [['paginate', ['limit']]],
            ]

            testCases.forEach(keyArgs => {
                const result = paginateCache(keyArgs)
                expect(result.keyArgs).toEqual(keyArgs)
                expect(typeof result.merge).toBe('function')
                expect(result.merge.length).toBe(3) // existing, incoming, context
            })
        })
    })

    describe('Fresh Start Behavior (offset 0 or undefined)', () => {
        it('should replace existing data completely', () => {
            const existing = [{ id: '1' }, { id: '2' }]
            const incoming = [{ id: '3' }, { id: '4' }]

            const testCases = [
                { offset: 0 },
                {} // undefined offset defaults to 0
            ]

            testCases.forEach(paginate => {
                const result = paginateFn.merge(existing, incoming, {
                    args: { paginate },
                    fieldName: 'testField'
                } as any)

                expect(result).toEqual([{ id: '3' }, { id: '4' }])
            })
        })
    })

    describe('Deduplication Logic (offset > 0)', () => {
        it('should deduplicate by id field', () => {
            const existing = [{ id: '1', name: 'Original' }, { id: '2', name: 'Original' }]
            const incoming = [{ id: '2', name: 'Updated' }, { id: '3', name: 'New' }]

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'testField'
            } as any)

            // Should preserve existing items and only add truly new ones
            expect(result).toEqual([
                { id: '1', name: 'Original' },
                { id: '2', name: 'Original' }, // Preserves original, doesn't overwrite
                { id: '3', name: 'New' }
            ])
        })

        it('should deduplicate by __ref field (Apollo References)', () => {
            const existing = [{ __ref: 'Media:1' }, { __ref: 'Media:2' }]
            const incoming = [{ __ref: 'Media:2' }, { __ref: 'Media:3' }]

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'media'
            } as any)

            expect(result).toEqual([
                { __ref: 'Media:1' },
                { __ref: 'Media:2' },
                { __ref: 'Media:3' }
            ])
        })

        it('should handle mixed id and __ref objects', () => {
            const existing = [
                { __ref: 'User:1' },
                { id: '2', __typename: 'User', name: 'Jane' }
            ]
            const incoming = [
                { __ref: 'User:1' }, // Duplicate __ref
                { id: '2', __typename: 'User', name: 'Updated Jane' }, // Duplicate id
                { id: '3', __typename: 'User', name: 'Bob' }
            ]

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'users'
            } as any)

            expect(result).toEqual([
                { __ref: 'User:1' },
                { id: '2', __typename: 'User', name: 'Jane' }, // Original preserved
                { id: '3', __typename: 'User', name: 'Bob' }
            ])
        })

        it('should include all items without id or __ref (no deduplication possible)', () => {
            const existing = [{ name: 'John' }, { name: 'Jane' }]
            const incoming = [{ name: 'Bob' }, { name: 'Jane' }] // Duplicate name but no id

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'people'
            } as any)

            // All items included since no id/ref for deduplication
            expect(result).toEqual([
                { name: 'John' }, { name: 'Jane' },
                { name: 'Bob' }, { name: 'Jane' }
            ])
        })

        it('should include all primitive values (no deduplication possible)', () => {
            const existing = ['item1', 'item2']
            const incoming = ['item2', 'item3'] // 'item2' duplicate but primitive

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'items'
            } as any)

            expect(result).toEqual(['item1', 'item2', 'item2', 'item3'])
        })
    })

    describe('Null Item Filtering', () => {
        it('should filter out null items from both existing and incoming data', () => {
            const existing = [{ id: '1' }, null, { id: '2' }, null]
            const incoming = [null, { id: '3' }, null, { id: '4' }]

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'testField'
            } as any)

            expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }])
        })

        it('should handle arrays with only null values gracefully', () => {
            const existing = [null, null]
            const incoming = [null, { id: '1' }, null]

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 1 } },
                fieldName: 'testField'
            } as any)

            expect(result).toEqual([{ id: '1' }])
        })
    })

    describe('Edge Cases and Data Variations', () => {
        it('should handle various falsy existing data types', () => {
            const testCases = [undefined, null, []]
            const incoming = [{ id: '1' }, { id: '2' }]

            testCases.forEach(existing => {
                const result = paginateFn.merge(existing as any, incoming, {
                    args: { paginate: { offset: 1 } },
                    fieldName: 'testField'
                } as any)

                expect(result).toEqual([{ id: '1' }, { id: '2' }])
            })
        })

        it('should handle empty incoming array', () => {
            const existing = [{ id: 'item1' }, { id: 'item2' }]
            const incoming: any[] = []

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 1 } },
                fieldName: 'testField'
            } as any)

            expect(result).toEqual([{ id: 'item1' }, { id: 'item2' }])
        })

        it('should handle non-numeric offset values correctly', () => {
            const existing = [{ id: '1' }]
            const incoming = [{ id: '2' }]

            // String offset should be truthy, triggering deduplication logic
            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: '2' as any } },
                fieldName: 'users'
            } as any)

            expect(result).toEqual([{ id: '1' }, { id: '2' }])
        })
    })

    describe('Error Handling', () => {
        it('should warn and preserve existing data for missing or invalid paginate argument', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
            const existing = [{ id: '1' }]
            const incoming = [{ id: '2' }]

            const invalidCases = [
                { args: {}, fieldName: 'testField' },
                { args: { paginate: null }, fieldName: 'testField' },
                { args: { paginate: undefined }, fieldName: 'testField' },
            ]

            try {
                invalidCases.forEach(context => {
                    consoleWarnSpy.mockClear()

                    const result = paginateFn.merge(existing, incoming, context as any)

                    expect(consoleWarnSpy).toHaveBeenCalledWith(
                        expect.stringContaining('Paginate argument is missing for field: testField')
                    )
                    expect(result).toEqual(existing)
                })

                invalidCases.forEach(context => {
                    consoleWarnSpy.mockClear()

                    const result = paginateFn.merge(undefined, incoming, context as any)

                    expect(consoleWarnSpy).toHaveBeenCalledWith(
                        expect.stringContaining('Paginate argument is missing for field: testField')
                    )
                    expect(result).toEqual([])
                    expect(result).not.toEqual(incoming)
                })
            } finally {
                consoleWarnSpy.mockRestore()
            }
        })
    })

    describe('Performance and Scale', () => {
        it('should handle large datasets with deduplication efficiently', () => {
            const existing = Array.from({ length: 500 }, (_, i) => ({ id: `item${i}` }))
            // Include some duplicates to test deduplication performance
            const incoming = Array.from({ length: 1000 }, (_, i) => ({
                id: i < 100 ? `item${i}` : `item${i + 400}` // First 100 are duplicates
            }))

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 500 } },
                fieldName: 'testField'
            } as any)

            // Should have original 500 + 900 new items (100 duplicates filtered out)
            expect(result).toHaveLength(1400)
            expect(result[0]).toEqual({ id: 'item0' })
            expect(result[499]).toEqual({ id: 'item499' })
            expect(result[500]).toEqual({ id: 'item500' }) // First new non-duplicate
        })
    })

    describe('Real-world Usage Scenarios', () => {
        it('should handle Album.media pagination correctly', () => {
            const paginateFn = paginateCache(['onlyFavorites', 'order'])

            const existing = Array.from({ length: 10 }, (_, i) => ({ __ref: `Media:${i + 1}` }))
            const incoming = Array.from({ length: 10 }, (_, i) => ({ __ref: `Media:${i + 11}` }))

            const result = paginateFn.merge(existing, incoming, {
                args: {
                    onlyFavorites: false,
                    order: 'date_desc',
                    paginate: { offset: 10 }
                },
                fieldName: 'media'
            } as any)

            expect(result).toHaveLength(20)
            expect(result[0]).toEqual({ __ref: 'Media:1' })
            expect(result[19]).toEqual({ __ref: 'Media:20' })
        })

        it('should handle Query.myTimeline refresh pattern', () => {
            const paginateFn = paginateCache(['onlyFavorites'])

            const existing = [{ __ref: 'Media:old1' }, { __ref: 'Media:old2' }]
            const incoming = [{ __ref: 'Media:new1' }, { __ref: 'Media:new2' }]

            const result = paginateFn.merge(existing, incoming, {
                args: { onlyFavorites: true, paginate: { offset: 0 } },
                fieldName: 'myTimeline'
            } as any)

            // Fresh start - completely replace existing
            expect(result).toEqual([{ __ref: 'Media:new1' }, { __ref: 'Media:new2' }])
        })

        it('should handle FaceGroup.imageFaces with empty keyArgs', () => {
            // myFaceGroups separates paginated and unbounded lists by limit
            const paginateFn = paginateCache([['paginate', ['limit']]])

            const existing = [
                { id: 'face1', __typename: 'ImageFace' },
                { id: 'face2', __typename: 'ImageFace' }
            ]
            const incoming = [
                { id: 'face3', __typename: 'ImageFace' },
                { id: 'face4', __typename: 'ImageFace' }
            ]

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'imageFaces'
            } as any)

            expect(result).toEqual([
                { id: 'face1', __typename: 'ImageFace' },
                { id: 'face2', __typename: 'ImageFace' },
                { id: 'face3', __typename: 'ImageFace' },
                { id: 'face4', __typename: 'ImageFace' }
            ])
        })

        it('should handle Query.myFaceGroups pagination', () => {
            // myFaceGroups separates paginated and unbounded lists by limit
            const paginateFn = paginateCache([['paginate', ['limit']]])

            const existing = [{ __ref: 'FaceGroup:1' }, { __ref: 'FaceGroup:2' }]
            const incoming = [{ __ref: 'FaceGroup:2' }, { __ref: 'FaceGroup:3' }] // One duplicate

            const result = paginateFn.merge(existing, incoming, {
                args: { paginate: { offset: 2 } },
                fieldName: 'myFaceGroups'
            } as any)

            expect(result).toEqual([
                { __ref: 'FaceGroup:1' },
                { __ref: 'FaceGroup:2' },
                { __ref: 'FaceGroup:3' }
            ])
        })
    })
})

describe('Pure Helper Functions', () => {
    describe('formatPath', () => {
        it('should format path with multiple segments', () => {
            expect(formatPath(['query', 'user', 0])).toBe('query::user::0')
        })

        it('should return "undefined" for undefined path', () => {
            expect(formatPath(undefined)).toBe('undefined')
        })

        it('should handle empty path', () => {
            expect(formatPath([])).toBe('')
        })
    })

    describe('calculateRetryDelay', () => {
        it('should calculate exponential backoff for retry 0', () => {
            const delay = calculateRetryDelay(0)
            expect(delay).toBeGreaterThanOrEqual(500)
            expect(delay).toBeLessThanOrEqual(1500)
        })

        it('should cap delay at 30s for high retry counts', () => {
            const delay = calculateRetryDelay(10)
            expect(delay).toBeLessThanOrEqual(30000)
            expect(delay).toBeGreaterThanOrEqual(15000)
        })

        it('should apply jitter', () => {
            const delays = Array.from({ length: 10 }, () => calculateRetryDelay(3))
            const uniqueDelays = new Set(delays)
            expect(uniqueDelays.size).toBeGreaterThan(1) // Jitter varies
        })
    })

    describe('getServerErrorMessages', () => {
        it('should extract errors from ServerError result', () => {
            const networkError = Object.assign(
                new Error('Server error'),
                {
                    result: {
                        errors: [{ message: 'Error 1' }]
                    }
                }
            )

            const errors = getServerErrorMessages(networkError)
            expect(errors).toHaveLength(1)
            expect(errors[0]).toEqual({ message: 'Error 1' })
        })

        it('should return empty array for undefined', () => {
            expect(getServerErrorMessages(undefined)).toEqual([])
        })

        it('should return empty array when no result property', () => {
            const networkError = new Error('Network error')

            const errors = getServerErrorMessages(networkError)
            expect(errors).toEqual([])
        })

        it('should return empty array when result is null', () => {
            const networkError = Object.assign(
                new Error('Server error'),
                { result: null }
            )

            const errors = getServerErrorMessages(networkError)
            expect(errors).toEqual([])
        })

        it('should return empty array when no errors in result', () => {
            const networkError = Object.assign(
                new Error('Server error'),
                {
                    result: { data: null }
                }
            )

            const errors = getServerErrorMessages(networkError)
            expect(errors).toEqual([])
        })

        it('should handle multiple errors', () => {
            const networkError = Object.assign(
                new Error('Server error'),
                {
                    result: {
                        errors: [
                            { message: 'Error 1' },
                            { message: 'Error 2' },
                            { message: 'Error 3' }
                        ]
                    }
                }
            )

            const errors = getServerErrorMessages(networkError)
            expect(errors).toHaveLength(3)
            expect(errors[0]).toEqual({ message: 'Error 1' })
            expect(errors[1]).toEqual({ message: 'Error 2' })
            expect(errors[2]).toEqual({ message: 'Error 3' })
        })
    })

    describe('isAuthNetworkError', () => {
        it('should return false for undefined', () => {
            expect(isAuthNetworkError(undefined)).toBe(false)
        })

        it('should return false for a plain error without statusCode', () => {
            const networkError = new Error('Network error')
            expect(isAuthNetworkError(networkError)).toBe(false)
        })

        it('should return true for a 401 status code', () => {
            const networkError = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
            expect(isAuthNetworkError(networkError)).toBe(true)
        })

        it('should return true for a 403 status code', () => {
            const networkError = Object.assign(new Error('Forbidden'), { statusCode: 403 })
            expect(isAuthNetworkError(networkError)).toBe(true)
        })

        it('should return false for a 500 status code', () => {
            const networkError = Object.assign(new Error('Server error'), { statusCode: 500 })
            expect(isAuthNetworkError(networkError)).toBe(false)
        })

        it('should return false for a 0 status code (network unreachable)', () => {
            const networkError = Object.assign(new Error('Failed to fetch'), { statusCode: 0 })
            expect(isAuthNetworkError(networkError)).toBe(false)
        })
    })

    describe('isLegitimateClose', () => {
        it('should treat a clean, normal closure (code 1000) as benign regardless of history', () => {
            const closeEvent = { code: 1000, reason: '', wasClean: true }
            expect(isLegitimateClose(closeEvent, false, 1)).toBe(true)
            expect(isLegitimateClose(closeEvent, true, 3)).toBe(true)
        })

        it('should treat a single closure before ever connecting as benign', () => {
            const closeEvent = { code: 1006, reason: '', wasClean: false }
            expect(isLegitimateClose(closeEvent, false, 1)).toBe(true)
            expect(isLegitimateClose(closeEvent, false, 0)).toBe(true)
        })

        it('should not treat repeated closures before ever connecting as benign', () => {
            const closeEvent = { code: 1006, reason: '', wasClean: false }
            expect(isLegitimateClose(closeEvent, false, 2)).toBe(false)
        })

        it('should not treat closures as benign once a connection has succeeded before', () => {
            const closeEvent = { code: 1006, reason: '', wasClean: false }
            expect(isLegitimateClose(closeEvent, true, 1)).toBe(false)
        })

        it('should treat a clean page-navigation closure (code 1001) as benign regardless of history', () => {
            const closeEvent = { code: 1001, reason: '', wasClean: true }
            expect(isLegitimateClose(closeEvent, false, 1)).toBe(true)
            expect(isLegitimateClose(closeEvent, true, 3)).toBe(true)
        })

        it('should NOT treat a non-clean 1001 as benign (that would be a real abnormal closure, not a refresh)', () => {
            const closeEvent = { code: 1001, reason: '', wasClean: false }
            expect(isLegitimateClose(closeEvent, true, 2)).toBe(false)
        })

        it('should not treat non-clean closures without a code as benign', () => {
            expect(isLegitimateClose(new Error('boom'), false, 2)).toBe(false)
        })
    })

    describe('getNetworkErrorNotification', () => {
        it('should build single/non-auth notification', () => {
            const result = getNetworkErrorNotification(false, 'single', { message: 'boom' })
            expect(result.header).toBe('Connection problem')
            expect(result.content).toBe('A temporary connection problem occurred: boom')
        })

        it('should build single/auth notification', () => {
            const result = getNetworkErrorNotification(true, 'single', { message: 'boom' })
            expect(result.header).toBe('Server error')
            expect(result.content).toBe('You are being logged out in an attempt to recover.\nboom')
        })

        it('should build multiple/non-auth notification', () => {
            const result = getNetworkErrorNotification(false, 'multiple', { count: 3 })
            expect(result.header).toBe('Multiple connection problems')
            expect(result.content).toBe('Received 3 errors from the server. Retrying automatically.')
        })

        it('should build multiple/auth notification', () => {
            const result = getNetworkErrorNotification(true, 'multiple', { count: 3 })
            expect(result.header).toBe('Multiple server errors')
            expect(result.content).toBe(
                'Received 3 errors from the server. You are being logged out in an attempt to recover.'
            )
        })

        it('should build generic/non-auth notification', () => {
            const result = getNetworkErrorNotification(false, 'generic')
            expect(result.header).toBe('Connection problem')
            expect(result.content).toBe('A temporary connection problem occurred. Retrying automatically.')
        })

        it('should build generic/auth notification', () => {
            const result = getNetworkErrorNotification(true, 'generic')
            expect(result.header).toBe('Authentication error')
            expect(result.content).toBe('You are being logged out in an attempt to recover.')
        })
    })
})
