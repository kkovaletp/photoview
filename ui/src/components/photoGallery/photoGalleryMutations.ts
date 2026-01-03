import { MediaGalleryFields } from './__generated__/MediaGalleryFields'
import { gql, MutationFunction } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import {
  markMediaFavorite,
  markMediaFavoriteVariables,
} from './__generated__/markMediaFavorite'

const markFavoriteMutation = gql`
  mutation markMediaFavorite($mediaId: ID!, $favorite: Boolean!) {
    favoriteMedia(mediaId: $mediaId, favorite: $favorite) {
      id
      favorite
    }
  }
`

export const useMarkFavoriteMutation = () => {
  return useMutation<markMediaFavorite, markMediaFavoriteVariables>(
    markFavoriteMutation
  )
}

export const toggleFavoriteAction = ({
  media,
  markFavorite,
}: {
  media: MediaGalleryFields
  markFavorite: MutationFunction<markMediaFavorite, markMediaFavoriteVariables>
}) => {
  return markFavorite({
    variables: {
      mediaId: media.id,
      favorite: !media.favorite,
    },
    optimisticResponse: {
      favoriteMedia: {
        id: media.id,
        favorite: !media.favorite,
        __typename: 'Media',
      },
    },
  })
}
