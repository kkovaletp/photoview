import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import SelectFaceGroupTable from './SelectFaceGroupTable'
import { myFaces_myFaceGroups } from '../__generated__/myFaces'
import { singleFaceGroup_faceGroup } from './__generated__/singleFaceGroup'

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback: string) => fallback || key,
    }),
}))

// Mock the primitives that use styled-components
vi.mock('../../../primitives/form/Input', () => ({
    TextField: ({ value, onChange, placeholder, fullWidth, ...props }: any) => (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={fullWidth ? 'w-full' : ''}
            data-testid="search-input"
            data-full-width={fullWidth}
            {...props}
        />
    ),
}))

// Test data setup
const mockFaceGroups: myFaces_myFaceGroups[] = [
    {
        __typename: 'FaceGroup',
        id: 'face-group-1',
        label: 'John Doe',
        imageFaceCount: 1,
        imageFaces: [
            {
                __typename: 'ImageFace',
                id: 'face-1',
                rectangle: {
                    __typename: 'FaceRectangle',
                    minX: 0.1,
                    maxX: 0.5,
                    minY: 0.1,
                    maxY: 0.5,
                },
                media: {
                    __typename: 'Media',
                    id: 'media-1',
                    title: 'Test Photo 1',
                    thumbnail: {
                        __typename: 'MediaURL',
                        url: 'http://test.com/thumb1.jpg',
                        width: 150,
                        height: 150,
                    },
                },
            },
        ],
    },
    {
        __typename: 'FaceGroup',
        id: 'face-group-2',
        label: 'Jane Smith',
        imageFaceCount: 1,
        imageFaces: [
            {
                __typename: 'ImageFace',
                id: 'face-2',
                rectangle: {
                    __typename: 'FaceRectangle',
                    minX: 0.2,
                    maxX: 0.6,
                    minY: 0.2,
                    maxY: 0.6,
                },
                media: {
                    __typename: 'Media',
                    id: 'media-2',
                    title: 'Test Photo 2',
                    thumbnail: {
                        __typename: 'MediaURL',
                        url: 'http://test.com/thumb2.jpg',
                        width: 150,
                        height: 150,
                    },
                },
            },
        ],
    },
    {
        __typename: 'FaceGroup',
        id: 'face-group-3',
        label: null,
        imageFaceCount: 1,
        imageFaces: [
            {
                __typename: 'ImageFace',
                id: 'face-3',
                rectangle: {
                    __typename: 'FaceRectangle',
                    minX: 0.3,
                    maxX: 0.7,
                    minY: 0.3,
                    maxY: 0.7,
                },
                media: {
                    __typename: 'Media',
                    id: 'media-3',
                    title: 'Test Photo 3',
                    thumbnail: {
                        __typename: 'MediaURL',
                        url: 'http://test.com/thumb3.jpg',
                        width: 150,
                        height: 150,
                    },
                },
            },
        ],
    },
]

const defaultProps = {
    faceGroups: mockFaceGroups,
    selectedFaceGroups: new Set<singleFaceGroup_faceGroup | myFaces_myFaceGroups | null>(),
    toggleSelectedFaceGroup: vi.fn(),
    title: 'Face Groups',
    frozen: false,
}

describe('SelectFaceGroupTable', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Rendering and Layout', () => {
        it('should render all essential components with proper structure and styling', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            // Table structure
            expect(screen.getAllByRole('table')).toHaveLength(2) // Header and body tables
            expect(document.querySelector('.overflow-auto.max-h-\\[500px\\]')).toBeInTheDocument()

            // Header and search
            expect(screen.getByText('Face Groups')).toBeInTheDocument()
            const searchInput = screen.getByPlaceholderText('Search faces...')
            expect(searchInput).toBeInTheDocument()
            expect(searchInput).toHaveClass('w-full')

            // Face group content
            expect(screen.getByText('John Doe')).toBeInTheDocument()
            expect(screen.getByText('Jane Smith')).toBeInTheDocument()
            expect(screen.getByText('Unlabeled')).toBeInTheDocument()

            // Unlabeled styling
            expect(screen.getByText('Unlabeled')).toHaveClass('text-gray-600', 'italic')

            // Images
            expect(screen.getAllByRole('img')).toHaveLength(3)

            // Table styling
            screen.getAllByRole('table').forEach(table => {
                expect(table).toHaveClass('w-full')
            })
        })

        it('should render with custom title and handle empty states', () => {
            // Custom title
            const customProps = { ...defaultProps, title: 'Custom Title' }
            const { rerender } = render(<SelectFaceGroupTable {...customProps} />)
            expect(screen.getByText('Custom Title')).toBeInTheDocument()

            // Empty face groups
            rerender(<SelectFaceGroupTable {...defaultProps} faceGroups={[]} />)
            expect(screen.getByText('Face Groups')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('Search faces...')).toBeInTheDocument()
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument()

            // Face groups with empty imageFaces
            const faceGroupWithoutImages: myFaces_myFaceGroups = {
                __typename: 'FaceGroup',
                id: 'empty-faces',
                label: 'No Images',
                imageFaceCount: 0,
                imageFaces: [],
            }
            rerender(<SelectFaceGroupTable {...defaultProps} faceGroups={[faceGroupWithoutImages]} />)
            expect(screen.getByText('No Images')).toBeInTheDocument()
        })
    })

    describe('Selection Behavior', () => {
        it('should handle selection interactions and highlighting correctly', () => {
            const mockToggle = vi.fn()
            const selectedSet = new Set([mockFaceGroups[0], mockFaceGroups[1]])
            const props = {
                ...defaultProps,
                toggleSelectedFaceGroup: mockToggle,
                selectedFaceGroups: selectedSet
            }

            render(<SelectFaceGroupTable {...props} />)

            // Selection highlighting
            expect(screen.getByText('John Doe').closest('td')).toHaveClass('brightness-110')
            expect(screen.getByText('John Doe')).toHaveClass('font-semibold', 'text-slate-100')
            expect(screen.getByText('Jane Smith').closest('td')).toHaveClass('brightness-110')

            // Click handling
            fireEvent.click(screen.getByText('John Doe').closest('tr')!)
            expect(mockToggle).toHaveBeenCalledWith(mockFaceGroups[0])

            // Cursor styles for interactive state
            const bodyRows = screen.getAllByRole('row').slice(2) // Skip header rows
            bodyRows.forEach(row => {
                expect(row).toHaveClass('cursor-pointer')
            })
        })

        it('should handle frozen state correctly', () => {
            const mockToggle = vi.fn()
            const frozenProps = {
                ...defaultProps,
                frozen: true,
                toggleSelectedFaceGroup: mockToggle
            }

            render(<SelectFaceGroupTable {...frozenProps} />)

            // Frozen cursor styles
            const bodyRows = screen.getAllByRole('row').slice(2) // Skip header rows
            bodyRows.forEach(row => {
                expect(row).toHaveClass('cursor-not-allowed')
            })

            // No click handling when frozen
            fireEvent.click(screen.getByText('John Doe').closest('tr')!)
            expect(mockToggle).not.toHaveBeenCalled()
        })
    })

    describe('Search Functionality', () => {
        it('should filter face groups with comprehensive search patterns', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)
            const searchInput = screen.getByPlaceholderText('Search faces...')

            // Case insensitive search
            fireEvent.change(searchInput, { target: { value: 'JOHN' } })
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
                expect(screen.queryByText('Unlabeled')).not.toBeInTheDocument()
            })

            // Partial match
            fireEvent.change(searchInput, { target: { value: 'Doe' } })
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })

            // No results
            fireEvent.change(searchInput, { target: { value: 'NonexistentName' } })
            await waitFor(() => {
                expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
                expect(screen.queryByText('Unlabeled')).not.toBeInTheDocument()
            })

            // Clear search - show all
            fireEvent.change(searchInput, { target: { value: '' } })
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.getByText('Jane Smith')).toBeInTheDocument()
                expect(screen.getByText('Unlabeled')).toBeInTheDocument()
            })
        })

        it('should handle unlabeled groups and rapid state changes correctly', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)
            const searchInput = screen.getByPlaceholderText('Search faces...')

            // Unlabeled groups should not be searchable
            fireEvent.change(searchInput, { target: { value: 'Unlabeled' } })
            await waitFor(() => {
                expect(screen.queryByText('Unlabeled')).not.toBeInTheDocument()
            })

            // Rapid typing simulation with state persistence
            fireEvent.change(searchInput, { target: { value: 'J' } })
            fireEvent.change(searchInput, { target: { value: 'Jo' } })
            fireEvent.change(searchInput, { target: { value: 'Joh' } })
            fireEvent.change(searchInput, { target: { value: 'John' } })

            await waitFor(() => {
                expect(searchInput).toHaveValue('John')
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })

            // State reset verification
            fireEvent.change(searchInput, { target: { value: 'Jane' } })
            await waitFor(() => {
                expect(searchInput).toHaveValue('Jane')
                expect(screen.getByText('Jane Smith')).toBeInTheDocument()
                expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
            })
        })
    })

    describe('Performance and Edge Cases', () => {
        it('should handle special data scenarios gracefully', () => {
            const specialFaceGroups: myFaces_myFaceGroups[] = [
                {
                    __typename: 'FaceGroup',
                    id: 'special-chars',
                    label: 'José García-López & María O\'Connor',
                    imageFaceCount: 1,
                    imageFaces: [
                        {
                            __typename: 'ImageFace',
                            id: 'face-special',
                            rectangle: {
                                __typename: 'FaceRectangle',
                                minX: 0.1,
                                maxX: 0.5,
                                minY: 0.1,
                                maxY: 0.5,
                            },
                            media: {
                                __typename: 'Media',
                                id: 'media-special',
                                title: 'Special Photo',
                                thumbnail: {
                                    __typename: 'MediaURL',
                                    url: 'http://test.com/special.jpg',
                                    width: 150,
                                    height: 150,
                                },
                            },
                        },
                    ],
                },
                {
                    __typename: 'FaceGroup',
                    id: 'long-label',
                    label: 'A'.repeat(200),
                    imageFaceCount: 1,
                    imageFaces: [
                        {
                            __typename: 'ImageFace',
                            id: 'face-long',
                            rectangle: {
                                __typename: 'FaceRectangle',
                                minX: 0.1,
                                maxX: 0.5,
                                minY: 0.1,
                                maxY: 0.5,
                            },
                            media: {
                                __typename: 'Media',
                                id: 'media-long',
                                title: 'Long Label Photo',
                                thumbnail: {
                                    __typename: 'MediaURL',
                                    url: 'http://test.com/long.jpg',
                                    width: 150,
                                    height: 150,
                                },
                            },
                        },
                    ],
                },
            ]

            const specialProps = { ...defaultProps, faceGroups: specialFaceGroups }
            render(<SelectFaceGroupTable {...specialProps} />)

            expect(screen.getByText('José García-López & María O\'Connor')).toBeInTheDocument()
            expect(screen.getByText('A'.repeat(200))).toBeInTheDocument()
        })

        it('should handle large datasets efficiently and missing image data', () => {
            const largeFaceGroupList: myFaces_myFaceGroups[] = Array.from({ length: 100 }, (_, i) => ({
                __typename: 'FaceGroup',
                id: `face-group-${i}`,
                label: `Person ${i}`,
                imageFaceCount: 1,
                imageFaces: [
                    {
                        __typename: 'ImageFace',
                        id: `face-${i}`,
                        rectangle: {
                            __typename: 'FaceRectangle',
                            minX: 0.1,
                            maxX: 0.5,
                            minY: 0.1,
                            maxY: 0.5,
                        },
                        media: {
                            __typename: 'Media',
                            id: `media-${i}`,
                            title: `Test Photo ${i}`,
                            thumbnail: {
                                __typename: 'MediaURL',
                                url: `http://test.com/thumb${i}.jpg`,
                                width: 150,
                                height: 150,
                            },
                        },
                    },
                ],
            }))

            const performanceProps = {
                ...defaultProps,
                faceGroups: largeFaceGroupList,
            }

            const startTime = performance.now()
            render(<SelectFaceGroupTable {...performanceProps} />)
            const endTime = performance.now()

            // Should render within reasonable time (less than 1 second)
            expect(endTime - startTime).toBeLessThan(1000)

            // Should render all items
            for (let i = 0; i < 100; i++) {
                expect(screen.getByText(`Person ${i}`)).toBeInTheDocument()
            }
        })

        it('should integrate with FaceCircleImage and handle missing image data gracefully', () => {
            const faceGroupWithoutFirstImage: myFaces_myFaceGroups = {
                __typename: 'FaceGroup',
                id: 'no-first-image',
                label: 'No First Image',
                imageFaces: [],
                imageFaceCount: 0
            }

            const propsWithMissingImage = {
                ...defaultProps,
                faceGroups: [faceGroupWithoutFirstImage],
            }

            // Should not crash with missing image data
            expect(() => {
                render(<SelectFaceGroupTable {...propsWithMissingImage} />)
            }).not.toThrow()

            expect(screen.getByText('No First Image')).toBeInTheDocument()

            // Verify FaceCircleImage integration with normal data
            render(<SelectFaceGroupTable {...defaultProps} />)
            expect(screen.getAllByRole('img')).toHaveLength(3)
        })
    })
})
