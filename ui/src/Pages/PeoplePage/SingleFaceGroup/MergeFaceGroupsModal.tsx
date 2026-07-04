import { gql, PureQueryOptions, useMutation, useQuery } from '@apollo/client'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { isNil } from '../../../helpers/utils'
import Modal, { ModalAction, ModalProps } from '../../../primitives/Modal'
import useScrollPagination from '../../../hooks/useScrollPagination'
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
import { SINGLE_FACE_GROUP } from './singleFaceGroupQuery'

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
  SelectPreselectedRole = 'select_preselected_role',
  SelectDestination = 'select_destination',
  SelectSources = 'select_sources',
}

type FaceGroupSelection = {
  __typename?: 'FaceGroup'
  id: string
  label?: string | null
}

type MergeFaceGroupsModalProps = {
  state: MergeFaceGroupsModalState
  setState(state: MergeFaceGroupsModalState): void
  preselectedFaceGroup?: FaceGroupSelection
  refetchQueries: PureQueryOptions[]
}

type StateContent = {
  props: ModalProps
  searchTitle: string
}

type PreselectedFaceGroupRole = 'source' | 'destination' | null

const FACE_GROUP_PAGE_SIZE = 50
const MODAL_SCROLL_ROOT_MARGIN = '0px 0px 160px 0px'

const MergeFaceGroupsModal = (props: MergeFaceGroupsModalProps) => {
  const { state, preselectedFaceGroup } = props

  if (state === MergeFaceGroupsModalState.Closed) {
    return null
  }

  if (
    state === MergeFaceGroupsModalState.SelectPreselectedRole && !preselectedFaceGroup
  ) {
    console.error(
      'MergeFaceGroupsModal opened with SelectPreselectedRole state but no preselectedFaceGroup'
    )
    return null
  }

  return <MergeFaceGroupsModalContent {...props} />
}

const MergeFaceGroupsModalContent = ({
  state,
  setState,
  preselectedFaceGroup,
  refetchQueries,
}: MergeFaceGroupsModalProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const {
    data,
    loading: faceGroupsLoading,
    error: faceGroupsError,
    refetch: refetchFaceGroups,
    fetchMore,
  } = useQuery<MyFacesQuery, MyFacesQueryVariables>(MY_FACES_QUERY, {
    variables: {
      limit: FACE_GROUP_PAGE_SIZE,
      offset: 0,
    },
    skip:
      state === MergeFaceGroupsModalState.Closed ||
      state === MergeFaceGroupsModalState.SelectPreselectedRole,
    fetchPolicy: 'network-only',
  })

  const [combineFacesMutation, { error: combineError, reset: resetCombine }] = useMutation<
    CombineFacesMutation,
    CombineFacesMutationVariables
  >(COMBINE_FACES_MUTATION, {
    errorPolicy: 'all',
  })

  const [preselectedRole, setPreselectedRole] =
    useState<PreselectedFaceGroupRole>(null)

  const [selectedDestinationFaceGroup, setSelectedDestinationFaceGroup] =
    useState<FaceGroupSelection | null>(null)

  const [selectedSourceFaceGroupIDs, setSelectedSourceFaceGroupIDs] =
    useState<Set<string>>(new Set())

  const [inlineError, setInlineError] = useState<string | undefined>(undefined)
  const [isMerging, setIsMerging] = useState(false)

  const {
    containerElem: paginationSentinelElem,
    scrollRootElem: paginationScrollRootElem,
    loadingMore: loadingMoreFaceGroups,
  } = useScrollPagination<MyFacesQuery>({
    loading: faceGroupsLoading,
    fetchMore,
    data,
    getItems: data => data.myFaceGroups,
    pageSize: FACE_GROUP_PAGE_SIZE,
    rootMargin: MODAL_SCROLL_ROOT_MARGIN,
  })

  const modalTitle = t(
    'people_page.modal.merge_face_groups.title',
    'Merge Face Groups'
  )

  const isOpen = state !== MergeFaceGroupsModalState.Closed
  const effectiveDestinationFaceGroup: FaceGroupSelection | null =
    preselectedRole === 'destination' && preselectedFaceGroup && data?.myFaceGroups
      ? (data.myFaceGroups.find(fg => fg.id === preselectedFaceGroup.id) ?? selectedDestinationFaceGroup)
      : selectedDestinationFaceGroup

  const resetModalState = useCallback(() => {
    setInlineError(undefined)
    resetCombine?.()
    setPreselectedRole(null)
    setSelectedDestinationFaceGroup(null)
    setSelectedSourceFaceGroupIDs(new Set())
  }, [resetCombine])

  const closeModal = useCallback(() => {
    if (isMerging) return
    setState(MergeFaceGroupsModalState.Closed)
    resetModalState()
  }, [isMerging, resetModalState, setState])

  const cancelAction: ModalAction = {
    key: 'cancel',
    label: t('general.action.cancel', 'Cancel'),
    onClick: closeModal,
    disabled: isMerging,
  }

  const choosePreselectedAsDestination = () => {
    if (!preselectedFaceGroup) return

    setInlineError(undefined)
    resetCombine?.()
    setPreselectedRole('destination')
    setSelectedDestinationFaceGroup(preselectedFaceGroup)
    setSelectedSourceFaceGroupIDs(new Set())
    setState(MergeFaceGroupsModalState.SelectSources)
  }

  const choosePreselectedAsSource = () => {
    if (!preselectedFaceGroup) return

    setInlineError(undefined)
    resetCombine?.()
    setPreselectedRole('source')
    setSelectedDestinationFaceGroup(null)
    setSelectedSourceFaceGroupIDs(new Set([preselectedFaceGroup.id]))
    setState(MergeFaceGroupsModalState.SelectDestination)
  }

  const toggleSelectedSourceFaceGroup = (faceGroupID: string) => {
    setSelectedSourceFaceGroupIDs(prev => {
      const next = new Set(prev)
      if (next.has(faceGroupID)) {
        next.delete(faceGroupID)
      } else {
        next.add(faceGroupID)
      }
      return next
    })
  }

  const getSourceGroupIDs = () => {
    if (preselectedRole === 'source' && preselectedFaceGroup) {
      return [preselectedFaceGroup.id]
    }

    return [...selectedSourceFaceGroupIDs]
  }

  function handleFaceGroupToggled(faceGroup: FaceGroupSelection) {
    switch (state) {
      case MergeFaceGroupsModalState.SelectDestination:
        setSelectedDestinationFaceGroup(faceGroup)
        break

      case MergeFaceGroupsModalState.SelectSources:
        toggleSelectedSourceFaceGroup(faceGroup.id)
        break
    }
  }

  const goNext = () => {
    if (isNil(effectiveDestinationFaceGroup)) {
      throw new Error('No selected face group')
    }

    setState(MergeFaceGroupsModalState.SelectSources)
    setSelectedSourceFaceGroupIDs(new Set())
  }

  const mergeFaceGroups = () => {
    if (isNil(effectiveDestinationFaceGroup)) {
      throw new Error('No selected destination face group')
    }

    const sourceGroupIDs = getSourceGroupIDs()

    if (sourceGroupIDs.length === 0) return
    if (isMerging) return

    setIsMerging(true)
    setInlineError(undefined)
    resetCombine?.()

    combineFacesMutation({
      variables: {
        srcIDs: sourceGroupIDs,
        destID: effectiveDestinationFaceGroup.id,
      },
      update(cache, { data, errors }) {
        if (!data?.combineFaceGroups || (errors?.length ?? 0) > 0) return

        for (const srcID of sourceGroupIDs) {
          cache.evict({
            id: cache.identify({ __typename: 'FaceGroup', id: srcID }),
          })
        }
        cache.gc()
      },
      refetchQueries: ({ data, errors }) =>
        data?.combineFaceGroups && (errors?.length ?? 0) === 0
          ? [
            ...refetchQueries,
            {
              query: SINGLE_FACE_GROUP,
              variables: {
                id: effectiveDestinationFaceGroup.id,
                limit: 200,
                offset: 0,
              },
            },
          ]
          : [],
      awaitRefetchQueries: true,
    }).then(({ data, errors }) => {
      if (!data?.combineFaceGroups || (errors?.length ?? 0) > 0) return

      resetModalState()
      setState(MergeFaceGroupsModalState.Closed)
      navigate(`/people/${effectiveDestinationFaceGroup.id}`)
    }).catch((e: unknown) => {
      const message =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : t(
            'people_page.modal.merge_face_groups.error.network',
            'Network error while merging faces'
          )
      setInlineError(message)
    }).finally(() => {
      setIsMerging(false)
    })
  }

  const sourceGroupIDs = getSourceGroupIDs()

  const nextAction: ModalAction = {
    key: 'next',
    label: t('people_page.modal.action.next', 'Next'),
    onClick: () => goNext(),
    variant: 'positive',
    disabled: isNil(effectiveDestinationFaceGroup),
  }

  const mergeAction: ModalAction = {
    key: 'merge',
    label: t('people_page.modal.action.merge', 'Merge'),
    onClick: () => mergeFaceGroups(),
    variant: 'positive',
    disabled:
      isNil(effectiveDestinationFaceGroup) ||
      sourceGroupIDs.length === 0 ||
      isMerging,
  }

  if (state === MergeFaceGroupsModalState.SelectPreselectedRole && preselectedFaceGroup) {
    return (
      <Modal
        title={modalTitle}
        description={t(
          'people_page.modal.merge_face_groups.preselected_role_description',
          'Choose how the current face should be merged.'
        )}
        actions={[cancelAction]}
        onClose={closeModal}
        open={isOpen}
      >
        <div className="space-y-3">
          <button
            type="button"
            className="w-full rounded border border-gray-300 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-dark-800"
            onClick={choosePreselectedAsDestination}
          >
            <div className="font-semibold">
              {t(
                'people_page.modal.merge_face_groups.preselected_role.destination.title',
                'Merge other faces into this face'
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t(
                'people_page.modal.merge_face_groups.preselected_role.destination.description',
                'Keep the current face group and choose which other face groups should be merged into it.'
              )}
            </div>
          </button>

          <button
            type="button"
            className="w-full rounded border border-gray-300 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-dark-800"
            onClick={choosePreselectedAsSource}
          >
            <div className="font-semibold">
              {t(
                'people_page.modal.merge_face_groups.preselected_role.source.title',
                'Merge this face into another face'
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t(
                'people_page.modal.merge_face_groups.preselected_role.source.description',
                'Choose another destination face group. The current face group will be merged into it.'
              )}
            </div>
          </button>
        </div>
      </Modal>
    )
  }

  const selectDestinationProps: StateContent = {
    props: {
      title: modalTitle,
      description:
        preselectedRole === 'source'
          ? t(
            'people_page.modal.merge_face_groups.source_role_destination_description',
            'Select the destination face group that the current face should be merged into.'
          )
          : t(
            'people_page.modal.merge_face_groups.destination_description',
            'Select the face group that other groups should be merged into.'
          ),
      actions: preselectedRole === 'source'
        ? [cancelAction, mergeAction]
        : [cancelAction, nextAction],
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
      ` ${effectiveDestinationFaceGroup?.label ??
      t('people_page.face_group.unlabeled', 'Unlabeled') ??
      'Unlabeled'
      }`,
  }

  const modalContent =
    state === MergeFaceGroupsModalState.SelectDestination
      ? selectDestinationProps
      : selectSourcesProps

  const filteredFaceGroups =
    data?.myFaceGroups.filter(faceGroup => {
      if (
        state === MergeFaceGroupsModalState.SelectDestination &&
        preselectedRole === 'source'
      ) {
        return faceGroup.id !== preselectedFaceGroup?.id
      }

      if (state === MergeFaceGroupsModalState.SelectSources) {
        return faceGroup.id !== effectiveDestinationFaceGroup?.id
      }

      return true
    }) ?? []

  const selectedFaceGroupsForTable: Set<FaceGroupSelection | null> = new Set(
    filteredFaceGroups.filter(faceGroup =>
      state === MergeFaceGroupsModalState.SelectDestination
        ? faceGroup.id === effectiveDestinationFaceGroup?.id
        : selectedSourceFaceGroupIDs.has(faceGroup.id)
    )
  )

  let faceGroupContent = null
  if (faceGroupsLoading) {
    faceGroupContent = (
      <div>{t('general.loading.default', 'Loading...')}</div>
    )
  } else if (faceGroupsError) {
    faceGroupContent = (
      <div className="space-y-2 text-sm">
        <div
          role="alert"
          className="mb-2 rounded border border-red-300 bg-red-50 dark:bg-dark-900/50 px-3 py-2 text-sm text-red-800 dark:text-red-300"
        >
          {t(
            'people_page.modal.merge_face_groups.face_groups_load_error',
            'Failed to load face groups'
          )}
          <div className="mt-2">
            <button
              type="button"
              className="underline"
              onClick={() => refetchFaceGroups().catch(() => undefined)}
            >
              {t('general.action.retry', 'Retry')}
            </button>
          </div>
        </div>
      </div>
    )
  } else {
    faceGroupContent = (
      <div
        ref={paginationScrollRootElem}
        className="max-h-125 overflow-y-auto pr-1"
      >
        <SelectFaceGroupTable
          title={modalContent.searchTitle}
          frozen={isMerging}
          faceGroups={filteredFaceGroups}
          selectedFaceGroups={selectedFaceGroupsForTable}
          toggleSelectedFaceGroup={(face) => {
            if (!isMerging && face !== null) handleFaceGroupToggled(face)
          }}
        />

        <div
          ref={paginationSentinelElem}
          className="h-1"
          aria-hidden="true"
        />

        {loadingMoreFaceGroups && (
          <div className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('general.loading.default', 'Loading...')}
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal {...modalContent.props}>
      {(inlineError || combineError?.message) && (
        <div
          role="alert"
          className="mb-2 rounded border border-red-300 bg-red-50 dark:bg-dark-900/50 px-3 py-2 text-sm text-red-800 dark:text-red-300"
        >
          {inlineError ?? combineError?.message}
        </div>
      )}
      {faceGroupContent}
    </Modal>
  )
}

export default MergeFaceGroupsModal
