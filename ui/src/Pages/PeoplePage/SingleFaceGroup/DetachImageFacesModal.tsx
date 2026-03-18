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
    selectedImageFaces: Array<
      MyFacesQuery['myFaceGroups'][0]['imageFaces'][0] |
      SingleFaceGroupQuery['faceGroup']['imageFaces'][0]
    >
  ) => {
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
  selectedImageFaces?: Array<
    MyFacesQuery['myFaceGroups'][0]['imageFaces'][0] |
    SingleFaceGroupQuery['faceGroup']['imageFaces'][0]
  >
}

const DetachImageFacesModal = ({
  open,
  setOpen,
  faceGroup,
  selectedImageFaces: selectedImageFacesProp,
}: DetachImageFacesModalProps) => {
  const { t } = useTranslation()

  const [selectedImageFaces, setSelectedImageFaces] = useState<
    Array<
      MyFacesQuery['myFaceGroups'][0]['imageFaces'][0] |
      SingleFaceGroupQuery['faceGroup']['imageFaces'][0]
    >
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
        selectedImageFaces={selectedImageFaces}
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
