import { MediaGalleryFieldsFragment } from './__generated__/fragments'
import { gql, type TypedDocumentNode } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import {
  MarkMediaFavoriteMutation,
  MarkMediaFavoriteMutationVariables,
} from './__generated__/photoGalleryMutations'

const markFavoriteMutation: TypedDocumentNode<
  MarkMediaFavoriteMutation,
  MarkMediaFavoriteMutationVariables
> = gql`
  mutation markMediaFavorite($mediaId: ID!, $favorite: Boolean!) {
    favoriteMedia(mediaId: $mediaId, favorite: $favorite) {
      id
      favorite
    }
  }
`

export const useMarkFavoriteMutation = () => {
  return useMutation(markFavoriteMutation)
}

export const toggleFavoriteAction = ({
  media,
  markFavorite,
}: {
  media: MediaGalleryFieldsFragment
  markFavorite: useMutation.MutationFunction<
    MarkMediaFavoriteMutation,
    MarkMediaFavoriteMutationVariables
  >
}) => {
  return markFavorite({
    variables: {
      mediaId: media.id,
      favorite: !media.favorite,
    },
    optimisticResponse: {
      __typename: 'Mutation',
      favoriteMedia: {
        id: media.id,
        favorite: !media.favorite,
        __typename: 'Media',
      },
    },
  })
}
