import { Dispatch, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { TextField } from '../../../primitives/form/Input'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '../../../primitives/Table'
import FaceCircleImage from '../FaceCircleImage'
import { MyFacesQuery } from '../__generated__/PeoplePage'
import { SingleFaceGroupQuery } from './__generated__/SingleFaceGroup'

const FaceCircleWrapper = styled.div<{ $selected: boolean }>`
  display: inline-block;
  border-radius: 50%;
  border: 2px solid
    ${({ $selected }) => ($selected ? `#2185c9` : 'rgba(255,255,255,0)')};
`

const FlexCell = styled(TableCell)`
  display: flex;
  align-items: center;
`

export const RowLabel = styled.span<{ $selected: boolean }>`
  ${({ $selected }) => $selected && `font-weight: bold;`}
  margin-left: 12px;
  width: 100%;
`

type FaceGroupRowProps = {
  faceGroup: MyFacesQuery['myFaceGroups'][0]
  faceSelected: boolean
  selectable: boolean
  toggleFaceSelected(): void
}

const FaceGroupRow = ({
  faceGroup,
  faceSelected,
  selectable,
  toggleFaceSelected,
}: FaceGroupRowProps) => {
  const { t } = useTranslation()
  return (
    <TableRow onClick={toggleFaceSelected} className={selectable ? 'cursor-pointer' : 'cursor-not-allowed'}>
      <FlexCell className={faceSelected ? 'brightness-110' : ''}>
        <FaceCircleWrapper $selected={faceSelected}>
          <FaceCircleImage
            imageFace={faceGroup.imageFaces[0]}
            size="50px"
            selectable={false}
          />
        </FaceCircleWrapper>
        <span
          className={`ml-3 ${faceSelected ? 'font-semibold text-slate-100' : 'text-gray-400'
            } ${!faceSelected && !faceGroup.label ? 'text-gray-600 italic' : ''}`}
        >
          {faceGroup.label ??
            t('people_page.face_group.unlabeled', 'Unlabeled')}
        </span>
      </FlexCell>
    </TableRow>
  )
}

type SelectFaceGroupTableProps = {
  faceGroups: MyFacesQuery['myFaceGroups']
  selectedFaceGroup?: MyFacesQuery['myFaceGroups'][0] | SingleFaceGroupQuery['faceGroup'] | null
  setSelectedFaceGroup?: Dispatch<(MyFacesQuery['myFaceGroups'][0] | SingleFaceGroupQuery['faceGroup'] | null)>
  selectedFaceGroups?: Set<
    SingleFaceGroupQuery['faceGroup'] | MyFacesQuery['myFaceGroups'][0] | null
  >
  toggleSelectedFaceGroup?: Dispatch<
    SingleFaceGroupQuery['faceGroup'] | MyFacesQuery['myFaceGroups'][0] | null
  >
  title: string
  frozen?: boolean
}

const SelectFaceGroupTable = ({
  faceGroups,
  selectedFaceGroup,
  setSelectedFaceGroup,
  selectedFaceGroups,
  toggleSelectedFaceGroup,
  title,
  frozen = false
}: SelectFaceGroupTableProps) => {
  const { t } = useTranslation()
  const selectedIds = useMemo(() => {
    if (selectedFaceGroup) return new Set<string>([selectedFaceGroup.id])
    if (selectedFaceGroups && selectedFaceGroups.size > 0) {
      return new Set<string>(
        [...selectedFaceGroups]
          .filter((x): x is NonNullable<typeof x> => x !== null)
          .map(x => x.id)
      )
    }
    return new Set<string>()
  }, [selectedFaceGroup, selectedFaceGroups])

  const [searchValue, setSearchValue] = useState('')

  const rows = faceGroups
    .filter(x => (x.label ?? '').toLowerCase().includes(searchValue.toLowerCase()))
    .map(face => {
      const isSelected = selectedIds.has(face.id)
      const onToggle = () => {
        if (frozen) return
        if (setSelectedFaceGroup) setSelectedFaceGroup(face)
        else toggleSelectedFaceGroup?.(face)
      }
      return (
        <FaceGroupRow
          key={face.id}
          faceGroup={face}
          faceSelected={isSelected}
          selectable={!frozen}
          toggleFaceSelected={onToggle}
        />
      )
    })

  return (
    <>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>{title}</TableHeaderCell>
          </TableRow>
          <TableRow>
            <TableHeaderCell>
              <TextField
                fullWidth
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder={t(
                  'people_page.tableselect_face_group.search_faces_placeholder',
                  'Search faces...'
                )}
              />
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
      </Table>
      <div className="overflow-auto max-h-125 mt-2">
        <Table className="w-full">
          <TableBody>{rows}</TableBody>
        </Table>
      </div>
    </>
  )
}

export default SelectFaceGroupTable
