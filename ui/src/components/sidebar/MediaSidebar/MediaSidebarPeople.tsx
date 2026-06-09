import { Dispatch, SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import FaceCircleImage from '../../../Pages/PeoplePage/FaceCircleImage'
import { SidebarSection, SidebarSectionTitle } from '../SidebarComponents'
import { MediaSidebarMedia, SIDEBAR_MEDIA_QUERY } from './MediaSidebar'
import { SidebarMediaQueryQuery } from './__generated__/MediaSidebar'

import PeopleDotsIcon from './icons/peopleDotsIcon.svg?react'
import { MenuItem, MenuItems, MenuButton, Menu } from '@headlessui/react'
import { Button } from '../../../primitives/form/Input'
import { ArrowPopoverPanel } from '../Sharing'
import { tailwindClassNames } from '../../../helpers/utils'
import MergeFaceGroupsModal, {
  MergeFaceGroupsModalState,
} from '../../../Pages/PeoplePage/SingleFaceGroup/MergeFaceGroupsModal'
import { useDetachImageFaces } from '../../../Pages/PeoplePage/SingleFaceGroup/DetachImageFacesModal'
import MoveImageFacesModal from '../../../Pages/PeoplePage/SingleFaceGroup/MoveImageFacesModal'
import { FaceDetails } from '../../../Pages/PeoplePage/PeoplePage'

type PersonMoreMenuItemProps = {
  label: string
  className?: string
  onClick(): void
}

const PersonMoreMenuItem = ({
  label,
  className,
  onClick,
}: PersonMoreMenuItemProps) => {
  return (
    <MenuItem>
      {({ focus }) => (
        <button
          onClick={onClick}
          className={tailwindClassNames(
            `whitespace-normal w-full block py-1 cursor-pointer ${focus ? 'bg-gray-50 text-black' : 'text-gray-700'
            }`,
            className
          )}
        >
          {label}
        </button>
      )}
    </MenuItem>
  )
}

type PersonMoreMenuProps = {
  face: SidebarMediaQueryQuery['media']['faces'][0]
  setChangeLabel: Dispatch<SetStateAction<boolean>>
  className?: string
  menuFlipped: boolean
}

const PersonMoreMenu = ({
  menuFlipped,
  face,
  setChangeLabel,
  className,
}: PersonMoreMenuProps) => {
  const { t } = useTranslation()

  const [mergeModalState, setMergeModalState] = useState(
    MergeFaceGroupsModalState.Closed
  )
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)

  const refetchQueries = [
    {
      query: SIDEBAR_MEDIA_QUERY,
      variables: {
        id: face.media.id,
      },
    },
  ]

  const navigate = useNavigate()
  const { detachImageFaces, error: detachError } = useDetachImageFaces()

  const modals = (
    <>
      <MergeFaceGroupsModal
        preselectedFaceGroup={face.faceGroup}
        state={mergeModalState}
        setState={setMergeModalState}
        refetchQueries={refetchQueries}
      />
      <MoveImageFacesModal
        faceGroup={{ imageFaces: [], ...face.faceGroup }}
        open={moveModalOpen}
        setOpen={setMoveModalOpen}
        preselectedImageFaces={[face]}
      />
    </>
  )

  const detachImageFace = () => {
    if (
      !confirm(
        t(
          'sidebar.people.confirm_image_detach',
          'Are you sure you want to detach this image?'
        )
      )
    )
      return
    setInlineError(null)
    detachImageFaces([face], {
      sourceFaceGroupID: face.faceGroup.id,
      additionalRefetchQueries: [
        {
          query: SIDEBAR_MEDIA_QUERY,
          variables: { id: face.media.id },
        },
      ],
    }).then(({ data, errors }) => {
      if (!data?.detachImageFaces || (errors?.length ?? 0) > 0) return
      navigate(`/people/${data.detachImageFaces.id}`)
    }).catch((e: unknown) => {
      console.error('Failed to detach image face', e)
      setInlineError(
        e instanceof Error
          ? e.message
          : t(
            'people_page.modal.detach_image_faces.error.network',
            'Network error while detaching images'
          )
      )
    })
  }

  const displayedError = inlineError ?? detachError?.message ?? null

  return (
    <>
      <Menu
        as="div"
        className={tailwindClassNames('relative inline-block', className)}
      >
        <MenuButton as={Button}
          aria-label={t('sidebar.people.action_label.more_actions', 'Face actions')}
          title={t('sidebar.people.action_label.more_actions', 'More actions')}
          className="px-1.5 py-1.5 align-middle ml-1"
        >
          <PeopleDotsIcon className="text-gray-500" />
        </MenuButton>
        <MenuItems modal={false} className="">
          <ArrowPopoverPanel $width={120} $flipped={menuFlipped}>
            <PersonMoreMenuItem
              onClick={() => setChangeLabel(true)}
              className="border-b"
              label={t('people_page.action_label.change_label', 'Change label')}
            />
            <PersonMoreMenuItem
              onClick={() =>
                setMergeModalState(MergeFaceGroupsModalState.SelectPreselectedRole)
              }
              className="border-b"
              label={t('sidebar.people.action_label.merge_face', 'Merge face')}
            />
            <PersonMoreMenuItem
              onClick={() => detachImageFace()}
              className="border-b"
              label={t(
                'sidebar.people.action_label.detach_image',
                'Detach image'
              )}
            />
            <PersonMoreMenuItem
              onClick={() => setMoveModalOpen(true)}
              label={t('sidebar.people.action_label.move_face', 'Move face')}
            />
          </ArrowPopoverPanel>
        </MenuItems>
      </Menu>
      {displayedError && (
        <div
          role="alert"
          className="text-red-500 text-xs mt-1 max-w-30 whitespace-normal wrap-break-word"
        >
          {displayedError}
        </div>
      )}
      {modals}
    </>
  )
}

type MediaSidebarFaceProps = {
  face: SidebarMediaQueryQuery['media']['faces'][0]
  menuFlipped: boolean
}

const MediaSidebarPerson = ({ face, menuFlipped }: MediaSidebarFaceProps) => {
  const [changeLabel, setChangeLabel] = useState(false)

  return (
    <li className="flex flex-col items-center">
      <Link to={`/people/${face.faceGroup.id}`}>
        <FaceCircleImage imageFace={face} selectable={true} size="92px" />
      </Link>
      <div className="mt-1 whitespace-nowrap">
        <FaceDetails
          className="text-sm max-w-20 align-middle"
          textFieldClassName="w-[100px]"
          group={face.faceGroup}
          editLabel={changeLabel}
          setEditLabel={setChangeLabel}
        />
        {!changeLabel && (
          <PersonMoreMenu
            menuFlipped={menuFlipped}
            className="pl-0.5"
            face={face}
            setChangeLabel={setChangeLabel}
          />
        )}
      </div>
    </li>
  )
}

type MediaSidebarFacesProps = {
  media: MediaSidebarMedia
}

const MediaSidebarPeople = ({ media }: MediaSidebarFacesProps) => {
  const { t } = useTranslation()

  const faceElms = (media.faces ?? []).map((face, i) => (
    <MediaSidebarPerson key={face.id} face={face} menuFlipped={i % 3 === 0} />
  ))

  if (faceElms.length === 0) return null

  return (
    <SidebarSection>
      <SidebarSectionTitle>
        {t('sidebar.people.title', 'People')}
      </SidebarSectionTitle>
      <ul className="grid grid-cols-3 gap-4 px-4">{faceElms}</ul>
    </SidebarSection>
  )
}

export default MediaSidebarPeople
