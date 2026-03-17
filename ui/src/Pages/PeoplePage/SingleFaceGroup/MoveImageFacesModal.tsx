import { gql, useLazyQuery, useMutation } from '@apollo/client'
import { useEffect, useState, Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import SelectFaceGroupTable from './SelectFaceGroupTable'
import SelectImageFacesTable from './SelectImageFacesTable'
import { MY_FACES_QUERY } from '../PeoplePage'
import { SingleFaceGroupQuery } from './__generated__/SingleFaceGroup'
import {
  MyFacesQuery,
  MyFacesQueryVariables
} from '../__generated__/PeoplePage'
import { isNil } from '../../../helpers/utils'
import {
  MoveImageFacesMutation,
  MoveImageFacesMutationVariables,
} from './__generated__/MoveImageFacesModal'
import { useTranslation } from 'react-i18next'
import Modal, { ModalAction } from '../../../primitives/Modal'

const MOVE_IMAGE_FACES_MUTATION = gql`
  mutation moveImageFaces($faceIDs: [ID!]!, $destFaceGroupID: ID!) {
    moveImageFaces(
      imageFaceIDs: $faceIDs
      destinationFaceGroupID: $destFaceGroupID
    ) {
      id
      imageFaces {
        id
      }
    }
  }
`

type MoveImageFacesModalProps = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  faceGroup: SingleFaceGroupQuery['faceGroup']
  preselectedImageFaces?: (
    | SingleFaceGroupQuery['faceGroup']['imageFaces'][0]
    | MyFacesQuery['myFaceGroups'][0]['imageFaces'][0]
  )[]
}

const MoveImageFacesModal = ({
  open,
  setOpen,
  faceGroup,
  preselectedImageFaces,
}: MoveImageFacesModalProps) => {
  const { t } = useTranslation()

  const [selectedImageFaces, setSelectedImageFaces] = useState<
    (SingleFaceGroupQuery['faceGroup']['imageFaces'][0] | MyFacesQuery['myFaceGroups'][0]['imageFaces'][0])[]
  >([])
  const [selectedFaceGroup, setSelectedFaceGroup] = useState<
    MyFacesQuery['myFaceGroups'][0] | SingleFaceGroupQuery['faceGroup'] | null
  >(null)
  const [imagesSelected, setImagesSelected] = useState(false)
  const navigate = useNavigate()

  const [moveImageFacesMutation] = useMutation<
    MoveImageFacesMutation,
    MoveImageFacesMutationVariables
  >(MOVE_IMAGE_FACES_MUTATION, {
    refetchQueries: [
      {
        query: MY_FACES_QUERY,
      },
    ],
  })

  const [loadFaceGroups, { data: faceGroupsData }] = useLazyQuery<
    MyFacesQuery,
    MyFacesQueryVariables
  >(MY_FACES_QUERY)

  useEffect(() => {
    if (isNil(preselectedImageFaces)) return
    setSelectedImageFaces(preselectedImageFaces)
    setImagesSelected(true)
  }, [preselectedImageFaces])

  useEffect(() => {
    if (imagesSelected) {
      loadFaceGroups()
    }
  }, [imagesSelected])

  useEffect(() => {
    if (!open) {
      setImagesSelected(false)
      setSelectedImageFaces([])
      setSelectedFaceGroup(null)
    }
  }, [open])

  if (!open) return null

  const moveImageFaces = () => {
    const faceIDs = selectedImageFaces.map(face => face.id)

    if (isNil(selectedFaceGroup)) {
      throw new Error('Expected selectedFaceGroup not to be null')
    }

    moveImageFacesMutation({
      variables: {
        faceIDs,
        destFaceGroupID: selectedFaceGroup.id,
      },
    }).then(() => {
      setOpen(false)
      navigate(`/people/${selectedFaceGroup.id}`)
    })
  }

  const imageFaces = faceGroup.imageFaces

  let table = null
  if (imagesSelected) {
    if (faceGroupsData && faceGroup) {
      const filteredFaceGroups = faceGroupsData.myFaceGroups.filter(
        x => x.id != faceGroup.id
      )
      table = (
        //TODO: how to fix the "Property 'frozen' is missing in type '{ title: "Select destination face group"; faceGroups: { __typename?: "FaceGroup" | undefined; id: string; label?: string | null | undefined; imageFaceCount: number; imageFaces: { __typename?: "ImageFace" | undefined; id: string; rectangle: { ...; }; media: { ...; }; }[]; }[]; selectedFaceGroup: { ...; } | ... 1 more...' but required in type 'SelectFaceGroupTableProps'." error?
        <SelectFaceGroupTable
          title={t(
            'people_page.modal.move_image_faces.destination_face_group_table.title',
            'Select destination face group'
          )}
          faceGroups={filteredFaceGroups}
          selectedFaceGroup={selectedFaceGroup}
          setSelectedFaceGroup={setSelectedFaceGroup}
        />
      )
    } else {
      table = <div>{t('general.loading.default', 'Loading...')}</div>
    }
  } else {
    table = (
      <SelectImageFacesTable
        imageFaces={imageFaces}
        selectedImageFaces={selectedImageFaces}
        setSelectedImageFaces={setSelectedImageFaces}
        title={t(
          'people_page.modal.move_image_faces.image_select_table.title',
          'Select images to move'
        )}
      />
    )
  }

  let positiveButton: ModalAction
  if (imagesSelected) {
    positiveButton = {
      key: 'move',
      label: t(
        'people_page.modal.move_image_faces.destination_face_group_table.move_action',
        'Move image faces'
      ),
      onClick: () => moveImageFaces(),
      variant: 'positive',
    }
  } else {
    positiveButton = {
      key: 'next',
      label: t(
        'people_page.modal.move_image_faces.image_select_table.next_action',
        'Next'
      ),
      onClick: () => setImagesSelected(true),
      variant: 'positive',
    }
  }

  return (
    <Modal
      title={t('people_page.modal.move_image_faces.title', 'Move Image Faces')}
      description={t(
        'people_page.modal.move_image_faces.description',
        'Move selected images of this face group to another face group'
      )}
      onClose={() => setOpen(false)}
      open={open}
      actions={[
        {
          key: 'cancel',
          label: t('general.action.cancel', 'Cancel'),
          onClick: () => setOpen(false),
        },
        positiveButton,
      ]}
    >
      {table}
    </Modal>
  )
}

export default MoveImageFacesModal
