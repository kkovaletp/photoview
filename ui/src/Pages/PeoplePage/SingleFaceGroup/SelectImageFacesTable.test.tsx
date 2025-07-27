import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import SelectImageFacesTable from './SelectImageFacesTable'
import { myFaces_myFaceGroups_imageFaces } from '../__generated__/myFaces'
import { singleFaceGroup_faceGroup_imageFaces } from './__generated__/singleFaceGroup'

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string) => fallback || key,
    }),
}))

// Mock styled-components ProtectedImage
vi.mock('../../../components/photoGallery/ProtectedMedia', () => ({
    ProtectedImage: ({ src, onClick, ...props }: any) => (
        <img
            src={src}
            onClick={onClick}
            data-testid="protected-image"
            {...props}
        />
    ),
}))

// Mock the primitives
vi.mock('../../../primitives/form/Checkbox', () => ({
    default: ({ label, checked, onChange }: any) => (
        <label data-testid="checkbox-label">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                data-testid="face-checkbox"
            />
            {label}
        </label>
    ),
}))

vi.mock('../../../primitives/form/Input', () => ({
    TextField: ({ value, onChange, placeholder, fullWidth, ...props }: any) => (
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            data-testid="search-input"
            data-full-width={fullWidth}
            {...props}
        />
    ),
}))

vi.mock('../../../primitives/Table', () => ({
    Table: ({ children, className }: any) => (
        <table className={className} data-testid="table">{children}</table>
    ),
    TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
    TableCell: ({ children, className }: any) => (
        <td className={className} data-testid="table-cell">{children}</td>
    ),
    TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
    TableHeaderCell: ({ children, colSpan }: any) => (
        <th colSpan={colSpan} data-testid="table-header-cell">{children}</th>
    ),
    TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}))

// Mock data for testing
const mockImageFaces: myFaces_myFaceGroups_imageFaces[] = [
    {
        __typename: 'ImageFace',
        id: '1',
        media: {
            __typename: 'Media',
            id: 'media-1',
            title: 'Beach Photo',
            thumbnail: {
                __typename: 'MediaURL',
                url: '/thumbnails/beach-photo.jpg',
                width: 200,
                height: 150,
            },
        },
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0,
            maxX: 1,
            minY: 0,
            maxY: 1,
        },
    },
    {
        __typename: 'ImageFace',
        id: '2',
        media: {
            __typename: 'Media',
            id: 'media-2',
            title: 'Mountain Hiking',
            thumbnail: {
                __typename: 'MediaURL',
                url: '/thumbnails/mountain-hiking.jpg',
                width: 300,
                height: 200,
            },
        },
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0,
            maxX: 1,
            minY: 0,
            maxY: 1,
        },
    },
    {
        __typename: 'ImageFace',
        id: '3',
        media: {
            __typename: 'Media',
            id: 'media-3',
            title: 'City Sunset',
            thumbnail: {
                __typename: 'MediaURL',
                url: '/thumbnails/city-sunset.jpg',
                width: 250,
                height: 180,
            },
        },
        rectangle: {
            __typename: 'FaceRectangle',
            minX: 0,
            maxX: 1,
            minY: 0,
            maxY: 1,
        },
    },
]

const defaultProps = {
    imageFaces: mockImageFaces,
    selectedImageFaces: [],
    setSelectedImageFaces: vi.fn(),
    title: 'Test Face Group',
}

const renderComponent = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props }
    return render(
        <MockedProvider mocks={[]}>
            <SelectImageFacesTable {...mergedProps} />
        </MockedProvider>
    )
}

describe('SelectImageFacesTable', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Basic Rendering', () => {
        it('renders without crashing', () => {
            renderComponent()
            expect(screen.getAllByTestId('table')).toHaveLength(2) // Header table and body table
        })

        it('displays the title correctly', () => {
            renderComponent({ title: 'My Custom Title' })
            expect(screen.getByText('My Custom Title')).toBeInTheDocument()
        })

        it('displays search input with correct placeholder', () => {
            renderComponent()
            const searchInput = screen.getByTestId('search-input')
            expect(searchInput).toBeInTheDocument()
            expect(searchInput).toHaveAttribute(
                'placeholder',
                'people_page.tableselect_image_faces.search_images_placeholder'
            )
        })

        it('applies fullWidth prop to search input', () => {
            renderComponent()
            const searchInput = screen.getByTestId('search-input')
            expect(searchInput).toHaveAttribute('data-full-width', 'true')
        })

        it('renders all image faces initially', () => {
            renderComponent()
            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(mockImageFaces.length)
        })

        it('displays correct image sources', () => {
            renderComponent()
            const images = screen.getAllByTestId('protected-image')

            images.forEach((img, index) => {
                expect(img).toHaveAttribute('src', mockImageFaces[index].media.thumbnail?.url)
            })
        })

        it('displays correct image titles in checkboxes', () => {
            renderComponent()

            mockImageFaces.forEach((face) => {
                expect(screen.getByText(face.media.title)).toBeInTheDocument()
            })
        })

        it('renders checkboxes for each image face', () => {
            renderComponent()
            const checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes).toHaveLength(mockImageFaces.length)
        })

        it('applies correct CSS classes to scrollable container', () => {
            renderComponent()
            const scrollableContainer = screen.getByTestId('table-body').closest('div')
            expect(scrollableContainer).toHaveClass('overflow-auto', 'max-h-[500px]', 'mt-2')
        })

        it('applies correct column span to header cells', () => {
            renderComponent()
            const headerCells = screen.getAllByTestId('table-header-cell')
            headerCells.forEach(cell => {
                expect(cell).toHaveAttribute('colSpan', '2')
            })
        })
    })

    describe('Search Functionality', () => {
        it('filters faces based on search input', async () => {
            renderComponent()
            const searchInput = screen.getByTestId('search-input')

            fireEvent.change(searchInput, { target: { value: 'Beach' } })

            await waitFor(() => {
                expect(screen.getByText('Beach Photo')).toBeInTheDocument()
                expect(screen.queryByText('Mountain Hiking')).not.toBeInTheDocument()
                expect(screen.queryByText('City Sunset')).not.toBeInTheDocument()
            })

            // Verify only one image is shown
            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(1)
        })

        it('performs case-insensitive search', async () => {
            renderComponent()
            const searchInput = screen.getByTestId('search-input')

            fireEvent.change(searchInput, { target: { value: 'mountain' } })

            await waitFor(() => {
                expect(screen.getByText('Mountain Hiking')).toBeInTheDocument()
                expect(screen.queryByText('Beach Photo')).not.toBeInTheDocument()
                expect(screen.queryByText('City Sunset')).not.toBeInTheDocument()
            })

            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(1)
        })

        it('shows all faces when search is cleared', async () => {
            renderComponent()
            const searchInput = screen.getByTestId('search-input')

            // First filter
            fireEvent.change(searchInput, { target: { value: 'Beach' } })
            await waitFor(() => {
                expect(screen.queryByText('Mountain Hiking')).not.toBeInTheDocument()
            })

            // Clear search
            fireEvent.change(searchInput, { target: { value: '' } })
            await waitFor(() => {
                expect(screen.getByText('Beach Photo')).toBeInTheDocument()
                expect(screen.getByText('Mountain Hiking')).toBeInTheDocument()
                expect(screen.getByText('City Sunset')).toBeInTheDocument()
            })

            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(mockImageFaces.length)
        })

        it('shows no results when search matches nothing', async () => {
            renderComponent()
            const searchInput = screen.getByTestId('search-input')

            fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

            await waitFor(() => {
                const images = screen.queryAllByTestId('protected-image')
                expect(images).toHaveLength(0)
            })
        })

        it('handles partial matches correctly', async () => {
            renderComponent()
            const searchInput = screen.getByTestId('search-input')

            fireEvent.change(searchInput, { target: { value: 'ing' } })

            await waitFor(() => {
                expect(screen.getByText('Mountain Hiking')).toBeInTheDocument()
                expect(screen.queryByText('Beach Photo')).not.toBeInTheDocument()
                expect(screen.queryByText('City Sunset')).not.toBeInTheDocument()
            })

            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(1)
        })

        it('filters correctly with multiple matching results', async () => {
            const facesWithSimilarTitles = [
                ...mockImageFaces,
                {
                    __typename: 'ImageFace' as const,
                    id: '4',
                    media: {
                        __typename: 'Media' as const,
                        id: 'media-4',
                        title: 'Beach Volleyball',
                        thumbnail: {
                            __typename: 'MediaURL' as const,
                            url: '/thumbnails/beach-volleyball.jpg',
                            width: 300,
                            height: 200,
                        },
                    },
                },
            ]

            renderComponent({ imageFaces: facesWithSimilarTitles })
            const searchInput = screen.getByTestId('search-input')

            fireEvent.change(searchInput, { target: { value: 'Beach' } })

            await waitFor(() => {
                expect(screen.getByText('Beach Photo')).toBeInTheDocument()
                expect(screen.getByText('Beach Volleyball')).toBeInTheDocument()
                expect(screen.queryByText('Mountain Hiking')).not.toBeInTheDocument()
                expect(screen.queryByText('City Sunset')).not.toBeInTheDocument()
            })

            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(2)
        })
    })

    describe('Selection Functionality', () => {
        it('shows unselected faces as unchecked', () => {
            renderComponent()
            const checkboxes = screen.getAllByTestId('face-checkbox')

            checkboxes.forEach(checkbox => {
                expect(checkbox).not.toBeChecked()
            })
        })

        it('shows selected faces as checked', () => {
            renderComponent({
                selectedImageFaces: [mockImageFaces[0], mockImageFaces[2]]
            })

            const checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes[0]).toBeChecked()
            expect(checkboxes[1]).not.toBeChecked()
            expect(checkboxes[2]).toBeChecked()
        })

        it('calls setSelectedImageFaces when checkbox is clicked to select', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({ setSelectedImageFaces })

            const firstCheckbox = screen.getAllByTestId('face-checkbox')[0]
            fireEvent.click(firstCheckbox)

            expect(setSelectedImageFaces).toHaveBeenCalledWith(expect.any(Function))

            // Test the function passed to setSelectedImageFaces
            const updateFunction = setSelectedImageFaces.mock.calls[0][0]
            const result = updateFunction([])
            expect(result).toEqual([mockImageFaces[0]])
        })

        it('calls setSelectedImageFaces when checkbox is clicked to deselect', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({
                selectedImageFaces: [mockImageFaces[0], mockImageFaces[1]],
                setSelectedImageFaces
            })

            const firstCheckbox = screen.getAllByTestId('face-checkbox')[0]
            fireEvent.click(firstCheckbox)

            expect(setSelectedImageFaces).toHaveBeenCalledWith(expect.any(Function))

            // Test the function passed to setSelectedImageFaces
            const updateFunction = setSelectedImageFaces.mock.calls[0][0]
            const result = updateFunction([mockImageFaces[0], mockImageFaces[1]])
            expect(result).toEqual([mockImageFaces[1]])
        })

        it('handles multiple selections correctly', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({ setSelectedImageFaces })

            const checkboxes = screen.getAllByTestId('face-checkbox')

            // Select first face
            fireEvent.click(checkboxes[0])
            let updateFunction = setSelectedImageFaces.mock.calls[0][0]
            let result = updateFunction([])
            expect(result).toEqual([mockImageFaces[0]])

            // Select second face
            fireEvent.click(checkboxes[1])
            updateFunction = setSelectedImageFaces.mock.calls[1][0]
            result = updateFunction([mockImageFaces[0]])
            expect(result).toEqual([mockImageFaces[0], mockImageFaces[1]])
        })

        it('handles deselection from multiple selections correctly', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({
                selectedImageFaces: [mockImageFaces[0], mockImageFaces[1], mockImageFaces[2]],
                setSelectedImageFaces
            })

            const middleCheckbox = screen.getAllByTestId('face-checkbox')[1]
            fireEvent.click(middleCheckbox)

            const updateFunction = setSelectedImageFaces.mock.calls[0][0]
            const result = updateFunction([mockImageFaces[0], mockImageFaces[1], mockImageFaces[2]])
            expect(result).toEqual([mockImageFaces[0], mockImageFaces[2]])
        })

        it('maintains selection state during search', async () => {
            renderComponent({
                selectedImageFaces: [mockImageFaces[0]]
            })

            // Confirm initial selection
            let checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes[0]).toBeChecked()

            // Filter to show only selected item
            const searchInput = screen.getByTestId('search-input')
            fireEvent.change(searchInput, { target: { value: 'Beach' } })

            await waitFor(() => {
                const filteredCheckboxes = screen.getAllByTestId('face-checkbox')
                expect(filteredCheckboxes).toHaveLength(1)
                expect(filteredCheckboxes[0]).toBeChecked()
            })
        })
    })

    describe('Image Click Functionality', () => {
        it('triggers selection when image is clicked', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({ setSelectedImageFaces })

            const firstImage = screen.getAllByTestId('protected-image')[0]
            fireEvent.click(firstImage)

            expect(setSelectedImageFaces).toHaveBeenCalledWith(expect.any(Function))

            // Test the function passed to setSelectedImageFaces
            const updateFunction = setSelectedImageFaces.mock.calls[0][0]
            const result = updateFunction([])
            expect(result).toEqual([mockImageFaces[0]])
        })

        it('triggers deselection when selected image is clicked', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({
                selectedImageFaces: [mockImageFaces[0]],
                setSelectedImageFaces
            })

            const firstImage = screen.getAllByTestId('protected-image')[0]
            fireEvent.click(firstImage)

            expect(setSelectedImageFaces).toHaveBeenCalledWith(expect.any(Function))

            // Test the function passed to setSelectedImageFaces
            const updateFunction = setSelectedImageFaces.mock.calls[0][0]
            const result = updateFunction([mockImageFaces[0]])
            expect(result).toEqual([])
        })

        it('image click and checkbox click have same behavior', () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({ setSelectedImageFaces })

            const firstImage = screen.getAllByTestId('protected-image')[0]
            const firstCheckbox = screen.getAllByTestId('face-checkbox')[0]

            // Click image
            fireEvent.click(firstImage)
            const imageUpdateFunction = setSelectedImageFaces.mock.calls[0][0]
            const imageResult = imageUpdateFunction([])

            // Clear mock and click checkbox
            setSelectedImageFaces.mockClear()
            fireEvent.click(firstCheckbox)
            const checkboxUpdateFunction = setSelectedImageFaces.mock.calls[0][0]
            const checkboxResult = checkboxUpdateFunction([])

            // Both should produce same result
            expect(imageResult).toEqual(checkboxResult)
            expect(imageResult).toEqual([mockImageFaces[0]])
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('handles empty imageFaces array', () => {
            renderComponent({ imageFaces: [] })

            expect(screen.getAllByTestId('table')).toHaveLength(2) // Header and body tables still render
            const images = screen.queryAllByTestId('protected-image')
            expect(images).toHaveLength(0)
            const checkboxes = screen.queryAllByTestId('face-checkbox')
            expect(checkboxes).toHaveLength(0)
        })

        it('handles null selectedImageFaces gracefully', () => {
            renderComponent({ selectedImageFaces: null })

            expect(screen.getAllByTestId('table')).toHaveLength(2)
            const checkboxes = screen.getAllByTestId('face-checkbox')
            checkboxes.forEach(checkbox => {
                expect(checkbox).not.toBeChecked()
            })
        })

        it('handles faces with missing thumbnail URLs', () => {
            const facesWithMissingThumbnails = [
                {
                    ...mockImageFaces[0],
                    media: {
                        ...mockImageFaces[0].media,
                        thumbnail: null,
                    },
                },
            ]

            renderComponent({ imageFaces: facesWithMissingThumbnails })

            const image = screen.getByTestId('protected-image')
            expect(image).toHaveAttribute('src', '')
        })

        it('handles faces with undefined thumbnail', () => {
            const facesWithUndefinedThumbnail = [
                {
                    ...mockImageFaces[0],
                    media: {
                        ...mockImageFaces[0].media,
                        thumbnail: undefined,
                    },
                },
            ]

            renderComponent({ imageFaces: facesWithUndefinedThumbnail })

            const image = screen.getByTestId('protected-image')
            expect(image).toBeInTheDocument()
            expect(image).toHaveAttribute('src', '')
        })

        it('handles faces with missing media title', () => {
            const facesWithMissingTitle = [
                {
                    ...mockImageFaces[0],
                    media: {
                        ...mockImageFaces[0].media,
                        title: '',
                    },
                },
            ]

            renderComponent({ imageFaces: facesWithMissingTitle })

            expect(screen.getByText('')).toBeInTheDocument() // Empty title should still render
        })

        it('handles selection state inconsistencies', () => {
            // Test when selectedImageFaces contains items not in imageFaces
            const nonExistentFace = {
                __typename: 'ImageFace' as const,
                id: 'non-existent',
                media: {
                    __typename: 'Media' as const,
                    id: 'non-existent-media',
                    title: 'Non-existent',
                    thumbnail: null,
                },
            }

            renderComponent({
                selectedImageFaces: [nonExistentFace, mockImageFaces[0]]
            })

            const checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes[0]).toBeChecked() // First actual face should be checked
            expect(checkboxes[1]).not.toBeChecked()
            expect(checkboxes[2]).not.toBeChecked()
        })
    })

    describe('Performance Considerations', () => {
        it('handles large number of faces efficiently', () => {
            const largeFaceList = Array.from({ length: 100 }, (_, index) => ({
                __typename: 'ImageFace' as const,
                id: `face-${index}`,
                media: {
                    __typename: 'Media' as const,
                    id: `media-${index}`,
                    title: `Face ${index}`,
                    thumbnail: {
                        __typename: 'MediaURL' as const,
                        url: `/thumbnails/face-${index}.jpg`,
                        width: 200,
                        height: 150,
                    },
                },
            }))

            const startTime = performance.now()
            renderComponent({ imageFaces: largeFaceList })
            const endTime = performance.now()

            // Should render within reasonable time (2 seconds)
            expect(endTime - startTime).toBeLessThan(2000)

            const images = screen.getAllByTestId('protected-image')
            expect(images).toHaveLength(100)

            const checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes).toHaveLength(100)
        })

        it('does not cause excessive re-renders on search', async () => {
            const setSelectedImageFaces = vi.fn()
            renderComponent({ setSelectedImageFaces })

            const searchInput = screen.getByTestId('search-input')

            // Multiple rapid search changes
            fireEvent.change(searchInput, { target: { value: 'B' } })
            fireEvent.change(searchInput, { target: { value: 'Be' } })
            fireEvent.change(searchInput, { target: { value: 'Bea' } })
            fireEvent.change(searchInput, { target: { value: 'Beac' } })
            fireEvent.change(searchInput, { target: { value: 'Beach' } })

            await waitFor(() => {
                expect(screen.getByText('Beach Photo')).toBeInTheDocument()
            })

            // setSelectedImageFaces should not have been called during search
            expect(setSelectedImageFaces).not.toHaveBeenCalled()
        })

        it('efficiently filters large datasets', async () => {
            const largeFaceList = Array.from({ length: 500 }, (_, index) => ({
                __typename: 'ImageFace' as const,
                id: `face-${index}`,
                media: {
                    __typename: 'Media' as const,
                    id: `media-${index}`,
                    title: index % 10 === 0 ? `Special Face ${index}` : `Regular Face ${index}`,
                    thumbnail: {
                        __typename: 'MediaURL' as const,
                        url: `/thumbnails/face-${index}.jpg`,
                        width: 200,
                        height: 150,
                    },
                },
            }))

            renderComponent({ imageFaces: largeFaceList })
            const searchInput = screen.getByTestId('search-input')

            const startTime = performance.now()
            fireEvent.change(searchInput, { target: { value: 'Special' } })

            await waitFor(() => {
                const images = screen.getAllByTestId('protected-image')
                expect(images.length).toBeLessThan(100) // Should filter significantly
            })

            const endTime = performance.now()
            expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
        })
    })

    describe('Accessibility and User Experience', () => {
        it('provides proper labels for checkboxes', () => {
            renderComponent()

            mockImageFaces.forEach((face) => {
                const label = screen.getByText(face.media.title)
                expect(label).toBeInTheDocument()

                // Check that label is associated with checkbox
                const labelElement = label.closest('[data-testid="checkbox-label"]')
                expect(labelElement).toBeInTheDocument()
                expect(labelElement?.querySelector('[data-testid="face-checkbox"]')).toBeInTheDocument()
            })
        })

        it('maintains focus management for search input', () => {
            renderComponent()

            const searchInput = screen.getByTestId('search-input')
            searchInput.focus()
            expect(document.activeElement).toBe(searchInput)
        })

        it('provides semantic table structure', () => {
            renderComponent()

            expect(screen.getAllByTestId('table-header')).toHaveLength(1)
            expect(screen.getAllByTestId('table-body')).toHaveLength(1)
            expect(screen.getAllByTestId('table-row')).toHaveLength(mockImageFaces.length + 2) // +2 for header rows
        })

        it('applies correct styling classes for layout', () => {
            renderComponent()

            // Check for table cell with specific classes
            const tableCells = screen.getAllByTestId('table-cell')
            const checkboxCells = tableCells.filter(cell =>
                cell.querySelector('[data-testid="face-checkbox"]')
            )

            checkboxCells.forEach(cell => {
                expect(cell).toHaveClass('min-w-64', 'w-full')
            })
        })
    })

    describe('Integration with GraphQL Types', () => {
        it('works with myFaces_myFaceGroups_imageFaces type', () => {
            const typedFaces: myFaces_myFaceGroups_imageFaces[] = mockImageFaces

            expect(() => {
                renderComponent({ imageFaces: typedFaces })
            }).not.toThrow()

            expect(screen.getAllByTestId('protected-image')).toHaveLength(typedFaces.length)
        })

        it('works with singleFaceGroup_faceGroup_imageFaces type', () => {
            // Cast to simulate the other GraphQL type
            const typedFaces = mockImageFaces as unknown as singleFaceGroup_faceGroup_imageFaces[]

            expect(() => {
                renderComponent({ imageFaces: typedFaces })
            }).not.toThrow()

            expect(screen.getAllByTestId('protected-image')).toHaveLength(typedFaces.length)
        })

        it('handles mixed types in selection', () => {
            const mixedSelection = [
                mockImageFaces[0],
                mockImageFaces[1] as unknown as singleFaceGroup_faceGroup_imageFaces
            ]

            expect(() => {
                renderComponent({ selectedImageFaces: mixedSelection })
            }).not.toThrow()

            const checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes[0]).toBeChecked()
            expect(checkboxes[1]).toBeChecked()
            expect(checkboxes[2]).not.toBeChecked()
        })
    })

    describe('Component Props Validation', () => {
        it('handles prop changes correctly', () => {
            const { rerender } = renderComponent({ title: 'Original Title' })
            expect(screen.getByText('Original Title')).toBeInTheDocument()

            rerender(
                <MockedProvider mocks={[]}>
                    <SelectImageFacesTable
                        {...defaultProps}
                        title="Updated Title"
                    />
                </MockedProvider>
            )

            expect(screen.getByText('Updated Title')).toBeInTheDocument()
            expect(screen.queryByText('Original Title')).not.toBeInTheDocument()
        })

        it('updates selection when selectedImageFaces prop changes', () => {
            const { rerender } = renderComponent({ selectedImageFaces: [] })

            let checkboxes = screen.getAllByTestId('face-checkbox')
            checkboxes.forEach(checkbox => {
                expect(checkbox).not.toBeChecked()
            })

            rerender(
                <MockedProvider mocks={[]}>
                    <SelectImageFacesTable
                        {...defaultProps}
                        selectedImageFaces={[mockImageFaces[1]]}
                    />
                </MockedProvider>
            )

            checkboxes = screen.getAllByTestId('face-checkbox')
            expect(checkboxes[0]).not.toBeChecked()
            expect(checkboxes[1]).toBeChecked()
            expect(checkboxes[2]).not.toBeChecked()
        })

        it('updates face list when imageFaces prop changes', () => {
            const { rerender } = renderComponent()

            expect(screen.getAllByTestId('protected-image')).toHaveLength(3)

            const newFaces = [mockImageFaces[0]]
            rerender(
                <MockedProvider mocks={[]}>
                    <SelectImageFacesTable
                        {...defaultProps}
                        imageFaces={newFaces}
                    />
                </MockedProvider>
            )

            expect(screen.getAllByTestId('protected-image')).toHaveLength(1)
            expect(screen.getByText('Beach Photo')).toBeInTheDocument()
            expect(screen.queryByText('Mountain Hiking')).not.toBeInTheDocument()
        })
    })
})
