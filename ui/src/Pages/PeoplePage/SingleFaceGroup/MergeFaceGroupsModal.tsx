import { gql, PureQueryOptions, useMutation, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { isNil } from '../../../helpers/utils'
import Modal, { ModalAction, ModalProps } from '../../../primitives/Modal'
import { MY_FACES_QUERY } from '../PeoplePage'
import {
  MyFacesQuery,
  MyFacesQueryVariables
} from '../__generated__/PeoplePage'
import SelectFaceGroupTable from './SelectFaceGroupTable'
import {
  CombineFacesMutation,
  CombineFacesMutationVariables,
} from './__generated__/MergeFaceGroupsModal'
import { SingleFaceGroupQuery } from './__generated__/SingleFaceGroup'

export const COMBINE_FACES_MUTATION = gql`
  mutation combineFaces($destID: ID!, $srcIDs: [ID!]!) {
    combineFaceGroups(
      destinationFaceGroupID: $destID
      sourceFaceGroupIDs: $srcIDs
    ) {
      id
    }
  }
`

export enum MergeFaceGroupsModalState {
  Closed = 'closed',
  SelectDestination = 'select_destination',
  SelectSources = 'select_sources',
}

type MergeFaceGroupsModalProps = {
  state: MergeFaceGroupsModalState
  setState(state: MergeFaceGroupsModalState): void
  preselectedDestinationFaceGroup?: {
    __typename?: 'FaceGroup'
    id: string
  }
  refetchQueries: PureQueryOptions[]
}

type StateContent = {
  props: ModalProps
  searchTitle: string
}

type MyFaceGroupsOrSingleFaceGroupOrNull = MyFacesQuery['myFaceGroups'][0] | SingleFaceGroupQuery['faceGroup'] | null

const MergeFaceGroupsModal = ({
  state,
  setState,
  preselectedDestinationFaceGroup,
  refetchQueries,
}: MergeFaceGroupsModalProps) => {
  const { t } = useTranslation()

  const navigate = useNavigate()
  const { data } = useQuery<MyFacesQuery, MyFacesQueryVariables>(MY_FACES_QUERY, {
    skip: state === MergeFaceGroupsModalState.Closed,
  })
  const [combineFacesMutation, { error: combineError, reset: resetCombine }] = useMutation<
    CombineFacesMutation,
    CombineFacesMutationVariables
  >(COMBINE_FACES_MUTATION, {
    refetchQueries: ({ data }) =>
      data?.combineFaceGroups ? refetchQueries : [],
    errorPolicy: 'all',
  })

  // The destination face group
  const [selectedDestinationFaceGroup, setSelectedDestinationFaceGroup] =
    useState<MyFaceGroupsOrSingleFaceGroupOrNull>(null)

  // The set of currently selected face groups, on the modal page
  const [selectedFaceGroups, setSelectedFaceGroups] = useState<
    Set<MyFaceGroupsOrSingleFaceGroupOrNull>
  >(new Set())

  const [inlineError, setInlineError] = useState<string | undefined>(undefined)
  const [isMerging, setIsMerging] = useState(false)

  const addSelectedFaceGroup = (
    faceGroup: MyFaceGroupsOrSingleFaceGroupOrNull
  ) => setSelectedFaceGroups(prev => new Set(prev).add(faceGroup))
  const removeSelectedFaceGroup = (
    faceGroup: MyFaceGroupsOrSingleFaceGroupOrNull
  ) => {
    setSelectedFaceGroups(prev => {
      const s = new Set(prev)
      s.delete(faceGroup)
      return s
    })
  }

  const setDestinationFaceGroup = (
    faceGroup: MyFaceGroupsOrSingleFaceGroupOrNull
  ) => {
    if (isNil(faceGroup)) {
      setSelectedFaceGroups(new Set())
      setSelectedDestinationFaceGroup(null)
      return
    }

    // Overwrite the selected face groups with a set containing only the selected group
    setSelectedFaceGroups(
      new Set<MyFaceGroupsOrSingleFaceGroupOrNull>().add(
        faceGroup
      )
    )

    setSelectedDestinationFaceGroup(faceGroup)
  }

  // Go straight to the sources page if a destination face group is preselected, using the preselection as the destination
  useEffect(() => {
    if (isNil(preselectedDestinationFaceGroup)) return
    if (state !== MergeFaceGroupsModalState.SelectDestination) return

    const destinationFaceGroup = data?.myFaceGroups.find(
      x => x.id === preselectedDestinationFaceGroup?.id
    )
    if (isNil(destinationFaceGroup)) return

    setDestinationFaceGroup(destinationFaceGroup)
  }, [state, preselectedDestinationFaceGroup, data?.myFaceGroups])

  function handleFaceGroupToggled(newValue: MyFacesQuery['myFaceGroups'][0] | SingleFaceGroupQuery['faceGroup']) {
    switch (state) {
      case MergeFaceGroupsModalState.SelectDestination:
        setSelectedDestinationFaceGroup(newValue)
        setSelectedFaceGroups(new Set([newValue]))
        break
      case MergeFaceGroupsModalState.SelectSources:
        if (selectedFaceGroups.has(newValue))
          removeSelectedFaceGroup(newValue)
        else addSelectedFaceGroup(newValue)
        break
    }
  }

  // Show all face groups on the destination page, but filter out the destination group on the source page
  const filteredFaceGroups =
    data?.myFaceGroups.filter(
      x =>
        state === MergeFaceGroupsModalState.SelectDestination ||
        x.id !== selectedDestinationFaceGroup?.id
    ) ?? []

  const goNext = () => {
    if (isNil(selectedDestinationFaceGroup))
      throw new Error('No selected face group')

    setState(MergeFaceGroupsModalState.SelectSources)
    setSelectedFaceGroups(new Set())
  }

  const mergeFaceGroups = () => {
    if (isNil(selectedDestinationFaceGroup))
      throw new Error('No selected destination face group')

    const sourceGroupIDs: string[] = [...selectedFaceGroups].filter(fc => fc !== null).map(fc => fc.id)

    if (sourceGroupIDs.length === 0) return
    if (isMerging) return
    setIsMerging(true)

    setInlineError(undefined)
    resetCombine?.()

    combineFacesMutation({
      variables: {
        srcIDs: sourceGroupIDs,
        destID: selectedDestinationFaceGroup.id,
      },
    }).then(({ data }) => {
      if (!data) return
      setInlineError(undefined)
      setState(MergeFaceGroupsModalState.Closed)
      navigate(`/people/${selectedDestinationFaceGroup.id}`)
    }).catch((e: unknown) => {
      const message =
        (e as Error)?.message ??
        t('people_page.modal.merge_face_groups.error.network', 'Network error while merging faces')
      setInlineError(message)
    }).finally(() => {
      setIsMerging(false)
    })
  }

  const closeModal = () => {
    if (isMerging) return
    setState(MergeFaceGroupsModalState.Closed)
    setInlineError(undefined)
    resetCombine?.()
    setSelectedDestinationFaceGroup(null)
    setSelectedFaceGroups(new Set())
  }

  const isOpen: boolean = state !== MergeFaceGroupsModalState.Closed

  const cancelAction: ModalAction = {
    key: 'cancel',
    label: t('general.action.cancel', 'Cancel'),
    onClick: closeModal,
    disabled: isMerging,
  }

  const nextAction: ModalAction = {
    key: 'next',
    label: t('people_page.modal.action.next', 'Next'),
    onClick: () => goNext(),
    variant: 'positive',
    disabled: isNil(selectedDestinationFaceGroup),
  }

  const mergeAction: ModalAction = {
    key: 'merge',
    label: t('people_page.modal.action.merge', 'Merge'),
    onClick: () => mergeFaceGroups(),
    variant: 'positive',
    disabled: selectedFaceGroups.size === 0 || isMerging,
  }

  const modalTitle: string = t(
    'people_page.modal.merge_face_groups.title',
    'Merge Face Groups'
  )

  const selectDestinationProps: StateContent = {
    props: {
      title: modalTitle,
      description: t(
        'people_page.modal.merge_face_groups.destination_description',
        'Select the face group that other groups should be merged into.'
      ),
      actions: [cancelAction, nextAction],
      onClose: closeModal,
      open: isOpen,
    },
    searchTitle: t(
      'people_page.modal.merge_face_groups.destination_table.title',
      'Select the destination face'
    ),
  }

  const selectSourcesProps: StateContent = {
    props: {
      title: modalTitle,
      description: t(
        'people_page.modal.merge_face_groups.sources_description',
        'Select all face groups that will be merged into the destination group.'
      ),
      actions: [cancelAction, mergeAction],
      onClose: closeModal,
      open: isOpen,
    },
    searchTitle:
      t(
        'people_page.modal.merge_face_groups.sources_table.title',
        'Select one or more source faces to merge into:'
      ) +
      ` ${selectedDestinationFaceGroup?.label ??
      t('people_page.face_group.unlabeled', 'Unlabeled') ??
      'Unlabeled'
      }`,
  }

  const modalContent: StateContent =
    state === MergeFaceGroupsModalState.SelectDestination
      ? selectDestinationProps
      : selectSourcesProps

  return (
    <Modal {...modalContent.props}>
      {(inlineError || combineError?.message) && (
        <div role="alert" className="mb-2 rounded border border-red-300 bg-red-50 dark:bg-dark-900/50 px-3 py-2 text-sm text-red-800 dark:text-red-300">
          {inlineError ?? combineError?.message}
        </div>
      )}
      <SelectFaceGroupTable
        title={modalContent.searchTitle}
        frozen={state === MergeFaceGroupsModalState.SelectDestination && preselectedDestinationFaceGroup !== undefined}
        faceGroups={filteredFaceGroups}
        selectedFaceGroups={selectedFaceGroups}
        toggleSelectedFaceGroup={(face) => { if (face !== null) handleFaceGroupToggled(face) }}
      />
    </Modal>
  )
}

export default MergeFaceGroupsModal
