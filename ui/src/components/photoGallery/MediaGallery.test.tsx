import { screen } from '@testing-library/react'

import { MediaType } from '../../__generated__/globalTypes'
import MediaGallery from './MediaGallery'
import { MediaGalleryState } from './mediaGalleryReducer'
import { renderWithProviders } from '../../helpers/testUtils'

vi.mock('./photoGalleryMutations', () => ({
  useMarkFavoriteMutation: () => [vi.fn()],
}))

test('photo gallery with media', () => {
  const dispatchMedia = vi.fn()

  const mediaState: MediaGalleryState = {
    activeIndex: 0,
    media: [
      {
        id: '165',
        type: MediaType.Photo,
        thumbnail: {
          url: '/photo/thumbnail_3666760020_jpg_x76GG5pS.jpg',
          width: 768,
          height: 1024,
          __typename: 'MediaURL',
        },
        highRes: null,
        videoWeb: null,
        blurhash: null,
        favorite: false,
        __typename: 'Media',
      },
      {
        id: '122',
        type: MediaType.Photo,
        thumbnail: null,
        highRes: null,
        videoWeb: null,
        blurhash: null,
        favorite: false,
        __typename: 'Media',
      },
      {
        id: '98',
        type: MediaType.Video,
        thumbnail: null,
        highRes: null,
        videoWeb: null,
        blurhash: null,
        favorite: false,
        __typename: 'Media',
      },
    ],
    presenting: false,
  }

  renderWithProviders(
    <MediaGallery
      dispatchMedia={dispatchMedia}
      mediaState={mediaState}
      loading={false}
    />,
    { mocks: [] }
  )

  expect(
    screen.getByTestId('photo-gallery-wrapper').querySelectorAll('img')
  ).toHaveLength(3)
})

describe('photo gallery presenting', () => {
  const dispatchMedia = vi.fn()

  test('not presenting', () => {
    const mediaStateNoPresent: MediaGalleryState = {
      activeIndex: -1,
      media: [],
      presenting: false,
    }

    renderWithProviders(
      <MediaGallery
        dispatchMedia={dispatchMedia}
        loading={false}
        mediaState={mediaStateNoPresent}
      />,
      { mocks: [] }
    )

    expect(screen.queryByTestId('present-overlay')).not.toBeInTheDocument()
  })

  test('presenting', () => {
    const mediaStatePresent: MediaGalleryState = {
      activeIndex: 0,
      media: [
        {
          id: '165',
          type: MediaType.Photo,
          thumbnail: {
            url: '/photo/thumbnail_3666760020_jpg_x76GG5pS.jpg',
            width: 768,
            height: 1024,
            __typename: 'MediaURL',
          },
          highRes: null,
          videoWeb: null,
          blurhash: null,
          favorite: false,
          __typename: 'Media',
        },
      ],
      presenting: true,
    }

    renderWithProviders(
      <MediaGallery
        dispatchMedia={dispatchMedia}
        loading={false}
        mediaState={mediaStatePresent}
      />,
      { mocks: [] }
    )

    expect(screen.getByTestId('present-overlay')).toBeInTheDocument()
  })
})
