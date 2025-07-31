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

    describe('Basic Rendering', () => {
        it('should render the component without crashing', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            expect(screen.getAllByRole('table')).toHaveLength(2) // Header table and body table
        })

        it('should render the title in table header', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            expect(screen.getByText('Face Groups')).toBeInTheDocument()
        })

        it('should render search input field', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            expect(screen.getByPlaceholderText('Search faces...')).toBeInTheDocument()
        })

        it('should render all face groups in the table', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            expect(screen.getByText('John Doe')).toBeInTheDocument()
            expect(screen.getByText('Jane Smith')).toBeInTheDocument()
            expect(screen.getByText('Unlabeled')).toBeInTheDocument()
        })

        it('should render with custom title', () => {
            const customProps = { ...defaultProps, title: 'Custom Title' }
            render(<SelectFaceGroupTable {...customProps} />)

            expect(screen.getByText('Custom Title')).toBeInTheDocument()
        })
    })

    describe('Face Group Display', () => {
        it('should display labeled face groups correctly', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            expect(screen.getByText('John Doe')).toBeInTheDocument()
            expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        })

        it('should display "Unlabeled" for face groups without labels', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            expect(screen.getByText('Unlabeled')).toBeInTheDocument()
        })

        it('should render FaceCircleImage for each face group', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            // Should have 3 face circle images (one per face group)
            const faceImages = screen.getAllByRole('img')
            expect(faceImages).toHaveLength(3)
        })

        it('should apply correct styling to unlabeled face groups', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const unlabeledText = screen.getByText('Unlabeled')
            expect(unlabeledText).toHaveClass('text-gray-600', 'italic')
        })
    })

    describe('Selection Functionality', () => {
        it('should call toggleSelectedFaceGroup when a face group row is clicked', () => {
            const mockToggle = vi.fn()
            const props = { ...defaultProps, toggleSelectedFaceGroup: mockToggle }

            render(<SelectFaceGroupTable {...props} />)

            const johnDoeRow = screen.getByText('John Doe').closest('tr')
            fireEvent.click(johnDoeRow!)

            expect(mockToggle).toHaveBeenCalledWith(mockFaceGroups[0])
        })

        it('should highlight selected face groups', () => {
            const selectedSet = new Set([mockFaceGroups[0]])
            const props = { ...defaultProps, selectedFaceGroups: selectedSet }

            render(<SelectFaceGroupTable {...props} />)

            expect(screen.getByText('John Doe').closest('td')).toHaveClass('brightness-110')
            expect(screen.getByText('John Doe')).toHaveClass('font-semibold', 'text-slate-100')
        })

        it('should show cursor-pointer for selectable rows when not frozen', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const rows = screen.getAllByRole('row')
            // Skip header rows and check body rows
            const bodyRows = rows.slice(2)
            bodyRows.forEach(row => {
                expect(row).toHaveClass('cursor-pointer')
            })
        })

        it('should show cursor-not-allowed for rows when frozen', () => {
            const frozenProps = { ...defaultProps, frozen: true }
            render(<SelectFaceGroupTable {...frozenProps} />)

            const rows = screen.getAllByRole('row')
            // Skip header rows and check body rows
            const bodyRows = rows.slice(2)
            bodyRows.forEach(row => {
                expect(row).toHaveClass('cursor-not-allowed')
            })
        })

        it('should not call toggleSelectedFaceGroup when frozen and row is clicked', () => {
            const mockToggle = vi.fn()
            const frozenProps = {
                ...defaultProps,
                frozen: true,
                toggleSelectedFaceGroup: mockToggle
            }

            render(<SelectFaceGroupTable {...frozenProps} />)

            const johnDoeRow = screen.getByText('John Doe').closest('tr')
            fireEvent.click(johnDoeRow!)

            expect(mockToggle).not.toHaveBeenCalled()
        })

        it('should handle multiple selections correctly', () => {
            const selectedSet = new Set([mockFaceGroups[0], mockFaceGroups[1]])
            const props = { ...defaultProps, selectedFaceGroups: selectedSet }

            render(<SelectFaceGroupTable {...props} />)

            expect(screen.getByText('John Doe').closest('td')).toHaveClass('brightness-110')
            expect(screen.getByText('Jane Smith').closest('td')).toHaveClass('brightness-110')
        })
    })

    describe('Search Functionality', () => {
        it('should filter face groups based on search input', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')
            fireEvent.change(searchInput, { target: { value: 'John' } })

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
                expect(screen.queryByText('Unlabeled')).not.toBeInTheDocument()
            })
        })

        it('should be case insensitive when searching', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')
            fireEvent.change(searchInput, { target: { value: 'JOHN' } })

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })
        })

        it('should show all face groups when search is empty', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')

            // First filter
            fireEvent.change(searchInput, { target: { value: 'John' } })
            await waitFor(() => {
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })

            // Clear filter
            fireEvent.change(searchInput, { target: { value: '' } })
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.getByText('Jane Smith')).toBeInTheDocument()
                expect(screen.getByText('Unlabeled')).toBeInTheDocument()
            })
        })

        it('should show no results when search matches nothing', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')
            fireEvent.change(searchInput, { target: { value: 'NonexistentName' } })

            await waitFor(() => {
                expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
                expect(screen.queryByText('Unlabeled')).not.toBeInTheDocument()
            })
        })

        it('should not filter unlabeled face groups (they have no searchable label)', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')
            fireEvent.change(searchInput, { target: { value: 'Unlabeled' } })

            await waitFor(() => {
                expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
                expect(screen.queryByText('Unlabeled')).not.toBeInTheDocument()
            })
        })

        it('should handle partial matches in search', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')
            fireEvent.change(searchInput, { target: { value: 'Doe' } })

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })
        })
    })

    describe('Empty State Handling', () => {
        it('should handle empty face groups array', () => {
            const emptyProps = { ...defaultProps, faceGroups: [] }
            render(<SelectFaceGroupTable {...emptyProps} />)

            expect(screen.getByText('Face Groups')).toBeInTheDocument()
            expect(screen.getByPlaceholderText('Search faces...')).toBeInTheDocument()
            // No face group rows should be present
            expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
        })

        it('should handle face groups with empty imageFaces arrays', () => {
            const faceGroupWithoutImages: myFaces_myFaceGroups = {
                __typename: 'FaceGroup',
                id: 'empty-faces',
                label: 'No Images',
                imageFaceCount: 0,
                imageFaces: [],
            }

            const propsWithEmptyFaces = {
                ...defaultProps,
                faceGroups: [faceGroupWithoutImages],
            }

            render(<SelectFaceGroupTable {...propsWithEmptyFaces} />)

            expect(screen.getByText('No Images')).toBeInTheDocument()
        })
    })

    describe('Component Layout and Structure', () => {
        it('should have proper table structure with header and scrollable body', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const tables = screen.getAllByRole('table')
            expect(tables).toHaveLength(2)

            // Check for scrollable container
            const scrollableDiv = document.querySelector('.overflow-auto.max-h-\\[500px\\]')
            expect(scrollableDiv).toBeInTheDocument()
        })

        it('should render search input with full width', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')
            expect(searchInput).toHaveClass('w-full')
        })

        it('should apply correct spacing and styling classes', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const tables = screen.getAllByRole('table')
            tables.forEach(table => {
                expect(table).toHaveClass('w-full')
            })
        })
    })

    describe('Performance and Edge Cases', () => {
        it('should handle large number of face groups efficiently', () => {
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
            expect(screen.getByText('Person 0')).toBeInTheDocument()
            expect(screen.getByText('Person 99')).toBeInTheDocument()
        })

        it('should handle face groups with special characters in labels', () => {
            const specialCharsFaceGroups: myFaces_myFaceGroups[] = [
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
            ]

            const specialProps = { ...defaultProps, faceGroups: specialCharsFaceGroups }
            render(<SelectFaceGroupTable {...specialProps} />)

            expect(screen.getByText('José García-López & María O\'Connor')).toBeInTheDocument()
        })

        it('should handle very long labels gracefully', () => {
            const longLabelFaceGroups: myFaces_myFaceGroups[] = [
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

            const longProps = { ...defaultProps, faceGroups: longLabelFaceGroups }
            render(<SelectFaceGroupTable {...longProps} />)

            // Should handle long labels gracefully
            expect(screen.getByText('A'.repeat(200))).toBeInTheDocument()
        })

        it('should maintain search state during rapid typing', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')

            // Rapid typing simulation
            fireEvent.change(searchInput, { target: { value: 'J' } })
            fireEvent.change(searchInput, { target: { value: 'Jo' } })
            fireEvent.change(searchInput, { target: { value: 'Joh' } })
            fireEvent.change(searchInput, { target: { value: 'John' } })

            await waitFor(() => {
                expect(searchInput).toHaveValue('John')
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })
        })
    })

    describe('Integration with FaceCircleImage', () => {
        it('should pass correct props to FaceCircleImage', () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            // FaceCircleImage should be rendered with proper props
            // We can test this by ensuring the images are rendered
            const images = screen.getAllByRole('img')
            expect(images).toHaveLength(3)
        })

        it('should handle missing imageFaces gracefully', () => {
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

            // This should not crash even if imageFaces[0] is undefined
            expect(() => {
                render(<SelectFaceGroupTable {...propsWithMissingImage} />)
            }).not.toThrow()

            expect(screen.getByText('No First Image')).toBeInTheDocument()
        })
    })

    describe('State Management', () => {
        it('should maintain internal search state correctly', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')

            // Set search value
            fireEvent.change(searchInput, { target: { value: 'Jane' } })

            await waitFor(() => {
                expect(searchInput).toHaveValue('Jane')
                expect(screen.getByText('Jane Smith')).toBeInTheDocument()
                expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
            })

            // Change search value
            fireEvent.change(searchInput, { target: { value: 'John' } })

            await waitFor(() => {
                expect(searchInput).toHaveValue('John')
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })
        })

        it('should reset to show all groups when search is cleared', async () => {
            render(<SelectFaceGroupTable {...defaultProps} />)

            const searchInput = screen.getByPlaceholderText('Search faces...')

            // Apply filter
            fireEvent.change(searchInput, { target: { value: 'John' } })
            await waitFor(() => {
                expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
            })

            // Clear filter
            fireEvent.change(searchInput, { target: { value: '' } })
            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument()
                expect(screen.getByText('Jane Smith')).toBeInTheDocument()
                expect(screen.getByText('Unlabeled')).toBeInTheDocument()
            })
        })
    })
})
