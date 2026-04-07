import { Dispatch, SetStateAction, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import FaceCircleImage from '../../../Pages/PeoplePage/FaceCircleImage'
import { SidebarSection, SidebarSectionTitle } from '../SidebarComponents'
import { MediaSidebarMedia, SIDEBAR_MEDIA_QUERY } from './MediaSidebar'
import { SidebarMediaQueryQuery } from './__generated__/MediaSidebar'

import PeopleDotsIcon from './icons/peopleDotsIcon.svg?react'
import { MenuItem, MenuItems, MenuButton, Menu } from '@headlessui/react'
import { Button } from '../../../primitives/form/Input'
import { ArrowPopoverPanel } from '../Sharing'
import { isNil, tailwindClassNames } from '../../../helpers/utils'
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

  const refetchQueries = [
    {
      query: SIDEBAR_MEDIA_QUERY,
      variables: {
        id: face.media.id,
      },
    },
  ]

  const navigate = useNavigate()
  //TODO: how to consistently fix the following contract mismatch:
  // ui/src/Pages/PeoplePage/SingleFaceGroup/DetachImageFacesModal.tsx: Line 25 and Line 51 change useDetachImageFaces from “callable return + options arg” to “object return + no args”.
  // But ui/src/components/sidebar/MediaSidebar/MediaSidebarPeople.tsx (Line 80-82 and Line 101-115 in provided context) still uses the old contract, and ui/src/components/sidebar/MediaSidebar/MediaSidebarPeople.test.tsx (Line 87-94) mocks the old shape. This creates a blocker for the sidebar detach flow.
  // Please migrate those consumers in the same PR to the new { detachImageFaces, error } API.
  const detachImageFaceMutation = useDetachImageFaces({
    refetchQueries,
  })

  const modals = (
    <>
      <MergeFaceGroupsModal
        preselectedDestinationFaceGroup={face.faceGroup}
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
    //TODO: how to consistently fix the following contract mismatch:
    // ui/src/Pages/PeoplePage/SingleFaceGroup/DetachImageFacesModal.tsx: Line 25 and Line 51 change useDetachImageFaces from “callable return + options arg” to “object return + no args”.
    // But ui/src/components/sidebar/MediaSidebar/MediaSidebarPeople.tsx (Line 80-82 and Line 101-115 in provided context) still uses the old contract, and ui/src/components/sidebar/MediaSidebar/MediaSidebarPeople.test.tsx (Line 87-94) mocks the old shape. This creates a blocker for the sidebar detach flow.
    // Please migrate those consumers in the same PR to the new { detachImageFaces, error } API.
    detachImageFaceMutation([face]).then(({ data }) => {
      if (isNil(data)) throw new Error('Expected data not to be null')
      navigate(`/people/${data.detachImageFaces.id}`)
    })
  }

  return (
    <>
      <Menu
        as="div"
        className={tailwindClassNames('relative inline-block', className)}
      >
        <MenuButton as={Button} className="px-1.5 py-1.5 align-middle ml-1">
          <PeopleDotsIcon className="text-gray-500" />
        </MenuButton>
        <MenuItems className="">
          <ArrowPopoverPanel $width={120} $flipped={menuFlipped}>
            <PersonMoreMenuItem
              onClick={() => setChangeLabel(true)}
              className="border-b"
              label={t('people_page.action_label.change_label', 'Change label')}
            />
            <PersonMoreMenuItem
              onClick={() =>
                setMergeModalState(MergeFaceGroupsModalState.SelectDestination)
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
