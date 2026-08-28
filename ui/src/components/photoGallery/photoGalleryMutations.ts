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
    //TODO: How to fix the type mismatch here and in the `ui/src/components/photoGallery/photoGalleryReducer.test.ts` test?
    //Type '{ favoriteMedia: { id: string; favorite: boolean; __typename: "Media"; }; }' is not assignable to type 'MarkMediaFavoriteMutation | ((vars: Exact<{ mediaId: string | number; favorite: boolean; }>, { IGNORE }: { IGNORE: IgnoreModifier; }) => IgnoreModifier | MarkMediaFavoriteMutation) | undefined'.
    //Property '__typename' is missing in type '{ favoriteMedia: { id: string; favorite: boolean; __typename: "Media"; }; }' but required in type 'MarkMediaFavoriteMutation'.
    //photoGalleryMutations.ts(17, 3): '__typename' is declared here.
    optimisticResponse: {
      favoriteMedia: {
        id: media.id,
        favorite: !media.favorite,
        __typename: 'Media',
      },
    },
  })
}
