import { screen } from '@testing-library/react'
import { gql } from '@apollo/client'
import * as ApolloReact from '@apollo/client/react'
import type { useLazyQuery } from '@apollo/client/react'
import MediaSidebar, {
  MediaSidebarMedia,
  SIDEBAR_MEDIA_QUERY
} from './MediaSidebar'
import { SIDEBAR_DOWNLOAD_QUERY } from '../SidebarDownloadMedia'
import { MediaType } from '../../../__generated__/globalTypes'
import { renderWithProviders } from '../../../helpers/testUtils'
import * as authentication from '../../../helpers/authentication'
import type {
  SidebarMediaQueryQuery,
  SidebarMediaQueryQueryVariables,
} from './__generated__/MediaSidebar'

vi.mock('../../../helpers/authentication.ts')

const authToken = vi.mocked(authentication.authToken)

type SidebarLazyQueryResult = useLazyQuery.Result<
  SidebarMediaQueryQuery,
  SidebarMediaQueryQueryVariables
>

const makeLazyQueryResult = (
  result: Pick<SidebarLazyQueryResult, 'data' | 'error' | 'loading'>
): SidebarLazyQueryResult => result as SidebarLazyQueryResult

// Define the photo shares query directly in the test file
const SIDEBAR_GET_PHOTO_SHARES = gql`
  query sidebarGetPhotoShares($id: ID!) {
    media(id: $id) {
      id
      shares {
        id
        token
        label
        hasPassword
        expire
      }
    }
  }
`

describe('MediaSidebar', () => {
  const media: MediaSidebarMedia = {
    __typename: 'Media',
    id: '6867',
    title: '122A6069.jpg',
    type: MediaType.Photo,
    thumbnail: {
      __typename: 'MediaURL',
      url: '/photo/thumbnail.jpg',
      width: 1024,
      height: 839,
    },
    highRes: {
      __typename: 'MediaURL',
      url: '/photo/highres.jpg',
      width: 5322,
      height: 4362,
    },
    videoWeb: null,
    album: {
      __typename: 'Album',
      id: '2294',
      title: 'album_name',
    },
  }

  // Create mocks for all required GraphQL queries
  const mocks = [
    {
      request: {
        query: SIDEBAR_DOWNLOAD_QUERY,
        variables: { mediaId: '6867' }
      },
      result: {
        data: {
          media: {
            __typename: 'Media',
            id: '6867',
            downloads: [
              // Include at least one properly structured download item
              {
                __typename: 'Download',
                title: 'Original',
                mediaUrl: {
                  __typename: 'MediaURL',
                  url: '/download/original.jpg',
                  width: 5322,
                  height: 4362,
                  fileSize: 1234567
                }
              }
            ]
          }
        }
      }
    },
    {
      request: {
        query: SIDEBAR_GET_PHOTO_SHARES,
        variables: { id: '6867' }
      },
      result: {
        data: {
          media: {
            __typename: 'Media',
            id: '6867',
            shares: []
          }
        }
      }
    },
    {
      request: {
        query: SIDEBAR_MEDIA_QUERY,
        variables: { id: '6867' }
      },
      result: {
        data: {
          media: {
            __typename: 'Media',
            id: '6867',
            title: '122A6069.jpg',
            type: MediaType.Photo,
            highRes: {
              __typename: 'MediaURL',
              url: '/photo/highres.jpg',
              width: 5322,
              height: 4362,
            },
            thumbnail: {
              __typename: 'MediaURL',
              url: '/photo/thumbnail.jpg',
              width: 1024,
              height: 839,
            },
            videoWeb: null,
            videoMetadata: null,
            exif: null,
            album: {
              __typename: 'Album',
              id: '2294',
              title: 'album_name',
              path: []
            },
            faces: []
          }
        }
      }
    }
  ]

  test('render sample image, unauthorized', () => {
    authToken.mockImplementation(() => undefined)

    // Only need the download query for unauthorized view
    renderWithProviders(<MediaSidebar media={media} />, {
      mocks: [mocks[0]],
      apolloOptions: {
        defaultOptions: {
          watchQuery: { fetchPolicy: 'no-cache' },
          query: { fetchPolicy: 'no-cache' }
        }
      }
    })

    expect(screen.getByText('122A6069.jpg')).toBeInTheDocument()
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'http://localhost:3000/photo/highres.jpg'
    )

    expect(
      screen.queryByText('Set as album cover photo')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Sharing options')).not.toBeInTheDocument()
  })

  test('render sample image, authorized', () => {
    authToken.mockImplementation(() => 'token-here')

    // Need all mocks for authorized view
    renderWithProviders(<MediaSidebar media={media} />, {
      mocks: mocks,
      apolloOptions: {
        defaultOptions: {
          watchQuery: { fetchPolicy: 'no-cache' },
          query: { fetchPolicy: 'no-cache' }
        }
      }
    })

    expect(screen.getByText('122A6069.jpg')).toBeInTheDocument()
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      'http://localhost:3000/photo/highres.jpg'
    )

    expect(screen.getByText('Set as album cover photo')).toBeInTheDocument()
    expect(screen.getByText('Album path')).toBeInTheDocument()
  })

  test('displays loading state correctly', () => {
    // Use the media object already defined in the describe block
    authToken.mockImplementation(() => 'token-here')

    // Mock loadMedia to show loading state
    const loadMediaMock = vi.fn<ReturnType<typeof useLazyQuery>[0]>()

    //TODO: How to fix this type mismatch:
    /*
Type 'SidebarLazyQueryResult' is not assignable to type 'Result<unknown, OperationVariables, "complete" | "empty" | "streaming", undefined>'.
  Type 'Result<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, undefined> & { called: false; variables: Partial<Exact<{ id: string | number; }>>; data: undefined; dataState: "empty"; }' is not assignable to type 'Result<unknown, OperationVariables, "complete" | "empty" | "streaming", undefined>'.
    Type 'Result<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, undefined> & { called: false; variables: Partial<Exact<{ id: string | number; }>>; data: undefined; dataState: "empty"; }' is not assignable to type 'Result<unknown, OperationVariables, undefined> & { called: false; variables: Partial<OperationVariables>; data: undefined; dataState: "empty"; }'.
      Type 'Result<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, undefined> & { called: false; variables: Partial<Exact<{ id: string | number; }>>; data: undefined; dataState: "empty"; }' is not assignable to type 'Result<unknown, OperationVariables, undefined>'.
        Types of property 'subscribeToMore' are incompatible.
          Type 'SubscribeToMoreFunction<SidebarMediaQueryQuery, Exact<{ id: string | number; }>>' is not assignable to type 'SubscribeToMoreFunction<unknown, OperationVariables>'.
            Types of parameters 'options' and 'options' are incompatible.
              Type 'SubscribeToMoreOptions<unknown, any, any, OperationVariables>' is not assignable to type 'SubscribeToMoreOptions<SidebarMediaQueryQuery, any, any, Exact<{ id: string | number; }>>'.
                Types of property 'updateQuery' are incompatible.
                  Type 'SubscribeToMoreUpdateQueryFn<unknown, OperationVariables, any> | undefined' is not assignable to type 'SubscribeToMoreUpdateQueryFn<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, any> | undefined'.
                    Type 'SubscribeToMoreUpdateQueryFn<unknown, OperationVariables, any>' is not assignable to type 'SubscribeToMoreUpdateQueryFn<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, any>'.
                      Type 'unknown' is not assignable to type 'void | SidebarMediaQueryQuery'.
    */
    vi.spyOn(ApolloReact, 'useLazyQuery').mockReturnValue([
      loadMediaMock,
      makeLazyQueryResult({
        loading: true,
        error: undefined,
        data: undefined,
      }),
    ])

    renderWithProviders(<MediaSidebar media={media} />)

    // Should show the media from props while loading
    expect(screen.getByText('122A6069.jpg')).toBeInTheDocument()
  })

  test('displays error state correctly', () => {
    // Use the media object already defined in the describe block
    authToken.mockImplementation(() => 'token-here')

    // Mock a GraphQL error
    const loadMediaMock = vi.fn<ReturnType<typeof useLazyQuery>[0]>()

    //TODO: How to fix this type mismatch:
    /*
Type 'SidebarLazyQueryResult' is not assignable to type 'Result<unknown, OperationVariables, "complete" | "empty" | "streaming", undefined>'.
  Type 'Result<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, undefined> & { called: false; variables: Partial<Exact<{ id: string | number; }>>; data: undefined; dataState: "empty"; }' is not assignable to type 'Result<unknown, OperationVariables, "complete" | "empty" | "streaming", undefined>'.
    Type 'Result<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, undefined> & { called: false; variables: Partial<Exact<{ id: string | number; }>>; data: undefined; dataState: "empty"; }' is not assignable to type 'Result<unknown, OperationVariables, undefined> & { called: false; variables: Partial<OperationVariables>; data: undefined; dataState: "empty"; }'.
      Type 'Result<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, undefined> & { called: false; variables: Partial<Exact<{ id: string | number; }>>; data: undefined; dataState: "empty"; }' is not assignable to type 'Result<unknown, OperationVariables, undefined>'.
        Types of property 'subscribeToMore' are incompatible.
          Type 'SubscribeToMoreFunction<SidebarMediaQueryQuery, Exact<{ id: string | number; }>>' is not assignable to type 'SubscribeToMoreFunction<unknown, OperationVariables>'.
            Types of parameters 'options' and 'options' are incompatible.
              Type 'SubscribeToMoreOptions<unknown, any, any, OperationVariables>' is not assignable to type 'SubscribeToMoreOptions<SidebarMediaQueryQuery, any, any, Exact<{ id: string | number; }>>'.
                Types of property 'updateQuery' are incompatible.
                  Type 'SubscribeToMoreUpdateQueryFn<unknown, OperationVariables, any> | undefined' is not assignable to type 'SubscribeToMoreUpdateQueryFn<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, any> | undefined'.
                    Type 'SubscribeToMoreUpdateQueryFn<unknown, OperationVariables, any>' is not assignable to type 'SubscribeToMoreUpdateQueryFn<SidebarMediaQueryQuery, Exact<{ id: string | number; }>, any>'.
                      Type 'unknown' is not assignable to type 'void | SidebarMediaQueryQuery'.
    */
    vi.spyOn(ApolloReact, 'useLazyQuery').mockReturnValue([
      loadMediaMock,
      makeLazyQueryResult({
        loading: false,
        error: new Error('Failed to load media'),
        data: undefined,
      }),
    ])

    renderWithProviders(<MediaSidebar media={media} />)

    // Should show the error message
    expect(screen.getByText(/Failed to load media/)).toBeInTheDocument()
  })

  test('renders video content correctly', () => {
    // Create a video variant of the media object
    const videoMedia: MediaSidebarMedia = {
      ...media,
      type: MediaType.Video,
      videoWeb: {
        __typename: 'MediaURL',
        url: '/video/web.mp4',
        width: 1280,
        height: 720
      }
    }

    renderWithProviders(<MediaSidebar media={videoMedia} />)

    // Should render video element instead of image
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // Video testing would depend on how your ProtectedVideo component renders
  })
})
