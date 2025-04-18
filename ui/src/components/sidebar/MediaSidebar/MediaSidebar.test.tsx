import { screen } from '@testing-library/react'
import MediaSidebar, {
  MediaSidebarMedia,
  SIDEBAR_MEDIA_QUERY
} from './MediaSidebar'
import { SIDEBAR_DOWNLOAD_QUERY } from '../SidebarDownloadMedia'
import { MediaType } from '../../../__generated__/globalTypes'
import { renderWithProviders } from '../../../helpers/testUtils'
import { gql } from '@apollo/client'

import * as authentication from '../../../helpers/authentication'

vi.mock('../../../helpers/authentication.ts')

const authToken = vi.mocked(authentication.authToken)

// Define the photo shares query directly in the test file
const SIDEBAR_GET_PHOTO_SHARES = gql`
  query sidebarGetPhotoShares($id: ID!) {
    media(id: $id) {
      id
      shares {
        id
        token
        hasPassword
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
            id: '6867',
            downloads: []
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
            id: '6867',
            title: '122A6069.jpg',
            type: MediaType.Photo,
            highRes: {
              url: '/photo/highres.jpg',
              width: 5322,
              height: 4362,
            },
            thumbnail: {
              url: '/photo/thumbnail.jpg',
              width: 1024,
              height: 839,
            },
            videoWeb: null,
            videoMetadata: null,
            exif: null,
            album: {
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
    authToken.mockImplementation(() => null)

    // Only need the download query for unauthorized view
    renderWithProviders(<MediaSidebar media={media} />, {
      mocks: [mocks[0]]
    })

    expect(screen.getByText('122A6069.jpg')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute(
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
      mocks: mocks
    })

    expect(screen.getByText('122A6069.jpg')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      'http://localhost:3000/photo/highres.jpg'
    )

    expect(screen.getByText('Set as album cover photo')).toBeInTheDocument()
    expect(screen.getByText('Album path')).toBeInTheDocument()
  })
})
