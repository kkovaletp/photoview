import { MediaGalleryFieldsFragment } from './__generated__/fragments'
import { gql } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
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
  //TODO: Replace deprecated `useMutation`
  // @deprecated Avoid manually specifying generics on `useMutation`.
  // * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your query results.
  return useMutation<MarkMediaFavoriteMutation, MarkMediaFavoriteMutationVariables>(
    markFavoriteMutation
  )
}

export const toggleFavoriteAction = ({
  media,
  markFavorite,
}: {
  media: MediaGalleryFieldsFragment
  markFavorite: useMutation.MutationFunction<MarkMediaFavoriteMutation, MarkMediaFavoriteMutationVariables>
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
