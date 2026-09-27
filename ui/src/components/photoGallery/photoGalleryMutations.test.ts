import { expect, test, vi } from 'vitest'
import { MediaType } from '../../__generated__/globalTypes'
import type { MediaGalleryFieldsFragment } from './__generated__/fragments'
import { toggleFavoriteAction } from './photoGalleryMutations'

test.each([false, true])(
  'toggles favorite from %s with matching variables and optimistic response',
  favorite => {
    const media: MediaGalleryFieldsFragment = {
      __typename: 'Media',
      id: '165',
      type: MediaType.Photo,
      blurhash: null,
      favorite,
      thumbnail: null,
      highRes: null,
      videoWeb: null,
    }
    const markFavorite = vi.fn().mockResolvedValue({ data: null })

    toggleFavoriteAction({ media, markFavorite })

    expect(markFavorite).toHaveBeenCalledWith({
      variables: { mediaId: '165', favorite: !favorite },
      optimisticResponse: {
        __typename: 'Mutation',
        favoriteMedia: {
          __typename: 'Media',
          id: '165',
          favorite: !favorite,
        },
      },
    })
  }
)
