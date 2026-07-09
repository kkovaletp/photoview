import { MediaGalleryFieldsFragment } from './__generated__/fragments'
import { gql, MutationFunction, useMutation } from '@apollo/client'
import {
  MarkMediaFavoriteMutation,
  MarkMediaFavoriteMutationVariables,
} from './__generated__/photoGalleryMutations'

const markFavoriteMutation = gql`
  mutation markMediaFavorite($mediaId: ID!, $favorite: Boolean!) {
    favoriteMedia(mediaId: $mediaId, favorite: $favorite) {
      id
      favorite
    }
  }
`

export const useMarkFavoriteMutation = () => {
  return useMutation<MarkMediaFavoriteMutation, MarkMediaFavoriteMutationVariables>(
    markFavoriteMutation
  )
}

export const toggleFavoriteAction = ({
  media,
  markFavorite,
}: {
  media: MediaGalleryFieldsFragment
  markFavorite: MutationFunction<MarkMediaFavoriteMutation, MarkMediaFavoriteMutationVariables>
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
