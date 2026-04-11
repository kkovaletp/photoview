import { gql, useMutation } from '@apollo/client'
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

export const useDetachImageFaces = () => {
  const [detachImageFacesMutation, { error: detachError, reset: resetDetach }] = useMutation<
    DetachImageFacesMutation,
    DetachImageFacesMutationVariables
  >(DETACH_IMAGE_FACES_MUTATION, {
    refetchQueries: [{ query: MY_FACES_QUERY }],
    errorPolicy: 'all',
  })

  const detachImageFaces = async (
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

  return { detachImageFaces, error: detachError, reset: resetDetach }
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
  const [inlineError, setInlineError] = useState<string | undefined>(undefined)
  const [isDetaching, setIsDetaching] = useState(false)

  const [selectedImageFaces, setSelectedImageFaces] = useState<
    Array<
      MyFacesQuery['myFaceGroups'][0]['imageFaces'][0] |
      SingleFaceGroupQuery['faceGroup']['imageFaces'][0]
    >
  >([])
  const navigate = useNavigate()

  const { detachImageFaces, error: detachError, reset: resetDetach } = useDetachImageFaces()

  const detachImageFacesAction = () => {
    if (isDetaching) return
    setIsDetaching(true)
    setInlineError(undefined)
    detachImageFaces(selectedImageFaces).then(({ data, errors }) => {
      if (!data?.detachImageFaces || (errors?.length ?? 0) > 0) return
      setOpen(false)
      navigate(`/people/${data.detachImageFaces.id}`)
    }).catch((e: unknown) => {
      const message =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : t('people_page.modal.detach_image_faces.error.network', 'Network error while detaching images')
      setInlineError(message)
    }).finally(() => {
      setIsDetaching(false)
    })
  }

  useEffect(() => {
    if (!open) return
    if (isNil(selectedImageFacesProp)) {
      setSelectedImageFaces([])
      return
    }
    setSelectedImageFaces(selectedImageFacesProp)
  }, [open, selectedImageFacesProp])

  useEffect(() => {
    if (!open) {
      setSelectedImageFaces([])
      setInlineError(undefined)
      resetDetach?.()
    }
  }, [open, resetDetach])

  if (!open) return null

  const imageFaces = faceGroup?.imageFaces ?? []

  const closeModal = () => {
    if (isDetaching) return
    setOpen(false)
    setInlineError(undefined)
    resetDetach?.()
  }

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
          onClick: closeModal,
          disabled: isDetaching,
        },
        {
          key: 'detach',
          label: t(
            'people_page.modal.detach_image_faces.action.detach',
            'Detach image faces'
          ),
          variant: 'positive',
          onClick: detachImageFacesAction,
          disabled: selectedImageFaces.length === 0 || isDetaching,
        },
      ]}
      onClose={closeModal}
      open={open}
    >
      {(inlineError || detachError?.message) && (
        <div role="alert" className="mb-2 rounded border border-red-300 bg-red-50 dark:bg-dark-900/50 px-3 py-2 text-sm text-red-800 dark:text-red-300">
          {inlineError ?? detachError?.message}
        </div>
      )}
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
