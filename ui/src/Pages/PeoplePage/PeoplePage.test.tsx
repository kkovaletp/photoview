import { fireEvent, screen, waitFor } from '@testing-library/react'
import {
  PeoplePage,
  FaceDetails,
  FaceGroup,
  MY_FACES_QUERY,
  SET_GROUP_LABEL_MUTATION,
} from './PeoplePage'
import { myFaces_myFaceGroups } from './__generated__/myFaces'
import { renderWithProviders } from '../../helpers/testUtils'

vi.mock('../../hooks/useScrollPagination')

// Mock MergeFaceGroupsModal to prevent GraphQL query conflicts
vi.mock('./SingleFaceGroup/MergeFaceGroupsModal', () => ({
  __esModule: true,
  default: () => <div data-testid="merge-face-groups-modal">Merge Modal</div>,
  MergeFaceGroupsModalState: {
    Closed: 'closed',
    SelectDestination: 'select_destination',
    SelectSources: 'select_sources',
  },
}))

describe('PeoplePage component', () => {
  const graphqlMocks = [
    {
      request: {
        query: MY_FACES_QUERY,
        variables: {
          limit: 50,
          offset: 0,
        },
      },
      result: {
        data: {
          myFaceGroups: [
            {
              __typename: 'FaceGroup',
              id: '3',
              label: 'Person A',
              imageFaceCount: 2,
              imageFaces: [
                {
                  __typename: 'ImageFace',
                  id: '3',
                  rectangle: {
                    __typename: 'FaceRectangle',
                    minX: 0.2705079913139343,
                    maxX: 0.3408200144767761,
                    minY: 0.7691109776496887,
                    maxY: 0.881434977054596,
                  },
                  media: {
                    __typename: 'Media',
                    id: '63',
                    title: 'image.jpg',
                    thumbnail: {
                      __typename: 'MediaURL',
                      url: '/photo/thumbnail_image_jpg_p9x8dLWr.jpg',
                      width: 1024,
                      height: 641,
                    },
                  },
                },
              ],
            },
            {
              __typename: 'FaceGroup',
              id: '1',
              label: 'Person B',
              imageFaceCount: 1,
              imageFaces: [],
            },
          ],
        },
      },
    },
    {
      request: {
        query: MY_FACES_QUERY,
        variables: {},
      },
      result: {
        data: {
          myFaceGroups: [
            {
              __typename: 'FaceGroup',
              id: '3',
              label: 'Person A',
              imageFaceCount: 2,
              imageFaces: [],
            },
            {
              __typename: 'FaceGroup',
              id: '1',
              label: 'Person B',
              imageFaceCount: 1,
              imageFaces: [],
            },
          ],
        },
      },
    },
  ]

  test('people page', async () => {
    renderWithProviders(<PeoplePage />, {
      mocks: graphqlMocks,
      initialEntries: ['/people']
    })

    expect(screen.getByTestId('Layout')).toBeInTheDocument()
    expect(screen.getByText('Recognize unlabeled faces')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Person A')).toBeInTheDocument()
      expect(screen.getByText('Person B')).toBeInTheDocument()
    })

    expect(
      screen
        .getAllByRole('link')
        .some(x => x.getAttribute('href') == '/people/1')
    ).toBeTruthy()

    expect(
      screen
        .getAllByRole('link')
        .some(x => x.getAttribute('href') == '/people/3')
    ).toBeTruthy()
  })
})

describe('FaceDetails component', () => {
  const faceGroup: myFaces_myFaceGroups = {
    id: '3',
    label: null,
    imageFaceCount: 2,
    imageFaces: [
      {
        id: '3',
        rectangle: {
          minX: 0.2705079913139343,
          maxX: 0.3408200144767761,
          minY: 0.7691109776496887,
          maxY: 0.881434977054596,
          __typename: 'FaceRectangle',
        },
        media: {
          id: '63',
          title: 'image.jpg',
          thumbnail: {
            url: '/photo/thumbnail_image_jpg_p9x8dLWr.jpg',
            width: 1024,
            height: 641,
            __typename: 'MediaURL',
          },
          __typename: 'Media',
        },
        __typename: 'ImageFace',
      },
    ],
    __typename: 'FaceGroup',
  }

  test('unlabeled, no images', () => {
    const emptyFaceGroup: myFaces_myFaceGroups = {
      ...faceGroup,
      imageFaces: [],
    }

    renderWithProviders(
      <FaceDetails
        editLabel={false}
        setEditLabel={vi.fn()}
        group={emptyFaceGroup}
      />,
      { mocks: [] }
    )

    expect(screen.getByText('Unlabeled')).toBeInTheDocument()
  })

  test('labeled, with thumbnail', () => {
    const labeledFaceGroup: myFaces_myFaceGroups = {
      ...faceGroup,
      label: 'Some label',
    }

    renderWithProviders(
      <FaceDetails
        editLabel={false}
        setEditLabel={vi.fn()}
        group={labeledFaceGroup}
      />,
      { mocks: [] }
    )

    expect(screen.getByText(labeledFaceGroup.label!)).toBeInTheDocument()
    expect(screen.queryByText('Unlabeled')).not.toBeInTheDocument()
  })

  test('add label to face group', async () => {
    const graphqlMocks = [
      {
        request: {
          query: SET_GROUP_LABEL_MUTATION,
          variables: {
            groupID: '3',
            label: 'John Doe',
          },
        },
        newData: vi.fn(() => ({
          data: {
            setFaceGroupLabel: {
              __typename: 'FaceGroup',
              id: '3',
              label: 'John Doe',
            },
          },
        })),
      },
    ]
    renderWithProviders(<FaceGroup group={faceGroup} />, {
      mocks: graphqlMocks,
      apolloOptions: {
        addTypename: false
      }
    })

    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    fireEvent.click(btn)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')

    fireEvent.change(input, { target: { value: 'John Doe' } })
    fireEvent.keyUp(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(graphqlMocks[0].newData).toHaveBeenCalled()
    })
  })

  test('cancel add label to face group', () => {
    renderWithProviders(<FaceGroup group={faceGroup} />, {
      mocks: [],
      apolloOptions: {
        addTypename: false
      }
    })

    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Unlabeled')).toBeInTheDocument()

    fireEvent.click(btn)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')

    fireEvent.change(input, { target: { value: 'John Doe' } })
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

    expect(screen.queryByText('Unlabeled')).toBeInTheDocument()
  })
})
