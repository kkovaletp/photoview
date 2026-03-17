import { BaseMutationOptions, gql, useMutation } from '@apollo/client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { isNil } from '../../../helpers/utils'
import Modal from '../../../primitives/Modal'
import { MY_FACES_QUERY } from '../PeoplePage'
import { MyFacesQuery } from '../__generated__/PeoplePage'
import SelectImageFacesTable from './SelectImageFacesTable'
import {
  DetachImageFacesMutation,
  DetachImageFacesMutationVariables,
} from './__generated__/DetachImageFacesModal'
import { SingleFaceGroupQuery } from './__generated__/SingleFaceGroup'

const DETACH_IMAGE_FACES_MUTATION = gql`
  mutation detachImageFaces($faceIDs: [ID!]!) {
    detachImageFaces(imageFaceIDs: $faceIDs) {
      id
      label
    }
  }
`

export const useDetachImageFaces = (
  mutationOptions: BaseMutationOptions<
    DetachImageFacesMutation,
    DetachImageFacesMutationVariables
  >
) => {
  const [detachImageFacesMutation] = useMutation<
    DetachImageFacesMutation,
    DetachImageFacesMutationVariables
  >(DETACH_IMAGE_FACES_MUTATION, mutationOptions)

  return async (
    selectedImageFaces: (
      | MyFacesQuery['myFaceGroups'][0]['imageFaces']
      | SingleFaceGroupQuery['faceGroup']['imageFaces']
    )[]
  ) => {
    //TODO: how to fix the "Property 'id' does not exist on type '{ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; }[] | { ...; }[]'.
    // Property 'id' does not exist on type '{ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; }[]'." error?
    const faceIDs = selectedImageFaces.map(face => face.id)

    const result = await detachImageFacesMutation({
      variables: {
        faceIDs,
      },
    })

    return result
  }
}

type DetachImageFacesModalProps = {
  open: boolean
  setOpen(open: boolean): void
  faceGroup: MyFacesQuery['myFaceGroups'][0] | SingleFaceGroupQuery['faceGroup']
  selectedImageFaces?: (
    | MyFacesQuery['myFaceGroups'][0]['imageFaces']
    | SingleFaceGroupQuery['faceGroup']['imageFaces']
  )[]
}

const DetachImageFacesModal = ({
  open,
  setOpen,
  faceGroup,
  selectedImageFaces: selectedImageFacesProp,
}: DetachImageFacesModalProps) => {
  const { t } = useTranslation()

  const [selectedImageFaces, setSelectedImageFaces] = useState<
    (MyFacesQuery['myFaceGroups'][0]['imageFaces'] | SingleFaceGroupQuery['faceGroup']['imageFaces'])[]
  >([])
  const navigate = useNavigate()

  const detachImageFacesMutation = useDetachImageFaces({
    refetchQueries: [
      {
        query: MY_FACES_QUERY,
      },
    ],
  })

  const detachImageFaces = () => {
    detachImageFacesMutation(selectedImageFaces).then(({ data }) => {
      if (isNil(data)) throw new Error('Expected data not to be null')
      setOpen(false)
      navigate(`/people/${data.detachImageFaces.id}`)
    })
  }

  useEffect(() => {
    if (isNil(selectedImageFacesProp)) return
    setSelectedImageFaces(selectedImageFacesProp)
  }, [selectedImageFacesProp])

  useEffect(() => {
    if (!open) {
      setSelectedImageFaces([])
    }
  }, [open])

  if (!open) return null

  const imageFaces = faceGroup?.imageFaces ?? []

  return (
    <Modal
      title={t(
        'people_page.modal.detach_image_faces.title',
        'Detach Image Faces'
      )}
      description={t(
        'people_page.modal.detach_image_faces.description',
        'Detach selected images of this face group and move them to a new face groups'
      )}
      actions={[
        {
          key: 'cancel',
          label: t('general.action.cancel', 'Cancel'),
          onClick: () => setOpen(false),
        },
        {
          key: 'detach',
          label: t(
            'people_page.modal.detach_image_faces.action.detach',
            'Detach image faces'
          ),
          variant: 'positive',
          onClick: () => detachImageFaces(),
        },
      ]}
      onClose={() => setOpen(false)}
      open={open}
    >
      <SelectImageFacesTable
        imageFaces={imageFaces}
        //TODO: how to fix the "Type '({ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; }[] | { ...; }[])[]' is not assignable to type '({ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; } | { ...; })[]'.
        //   Type '{ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; }[] | { ...; }[]' is not assignable to type '{__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; } | {...; }'.
        // Type '{__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; }[]' is not assignable to type '{__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; } | {...; }'." error?
        selectedImageFaces={selectedImageFaces}
        //TODO: how to fix the "Type 'Dispatch<SetStateAction<({ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; }[...' is not assignable to type 'Dispatch<SetStateAction<({ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; } ...'.
        //   Type 'SetStateAction<({ __typename?: "ImageFace" | undefined; id: string; rectangle: { __typename?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: { __typename?: "Media" | undefined; id: string; title: string; thumbnail?: { ...; } | ... 1 more ... | undefined; }; } | { ...; ...' is not assignable to type 'SetStateAction<({__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; }[] | {......'.
        // Type '({__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; } | {...; })[]' is not assignable to type 'SetStateAction<({__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; }[] | {......'.
        // Type '({__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; } | {...; })[]' is not assignable to type '({__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; }[] | {...; }[])[]'.
        // Type '{__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; } | {...; }' is not assignable to type '{__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; }[] | {...; }[]'.
        // Type '{__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; }' is not assignable to type '{__typename ?: "ImageFace" | undefined; id: string; rectangle: {__typename ?: "FaceRectangle" | undefined; minX: number; maxX: number; minY: number; maxY: number; }; media: {__typename ?: "Media" | undefined; id: string; title: string; thumbnail?: {...; } | ... 1 more ... | undefined; }; }[] | {...; }[]'." error?
        setSelectedImageFaces={setSelectedImageFaces}
        title={t(
          'people_page.modal.detach_image_faces.action.select_images',
          'Select images to detach'
        )}
      />
    </Modal>
  )
}

export default DetachImageFacesModal
