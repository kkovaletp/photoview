import { useState, ChangeEvent } from 'react'
import { gql, useMutation } from '@apollo/client'
import { USERS_QUERY } from './UsersTable'
import { useTranslation } from 'react-i18next'
import { USER_ADD_ROOT_PATH_MUTATION } from './AddUserRow'
import {
  UserRemoveAlbumPathMutationMutation,
  UserRemoveAlbumPathMutationMutationVariables,
} from './__generated__/EditUserRowRootPaths'
import { SettingsUsersQueryQuery } from './__generated__/UsersTable'
import { UserAddRootPathMutation } from './__generated__/AddUserRow'
import { Button, TextField } from '../../../primitives/form/Input'
import { normalizePath } from '../../../helpers/normalize'

const USER_REMOVE_ALBUM_PATH_MUTATION = gql`
  mutation userRemoveAlbumPathMutation($userId: ID!, $albumId: ID!) {
    userRemoveRootAlbum(userId: $userId, albumId: $albumId) {
      id
    }
  }
`

type EditRootPathProps = {
  album: SettingsUsersQueryQuery['user'][0]['rootAlbums'][0]
  user: SettingsUsersQueryQuery['user'][0]
}

const EditRootPath = ({ album, user }: EditRootPathProps) => {
  const { t } = useTranslation()
  const [removeAlbumPath, { loading }] = useMutation<
    UserRemoveAlbumPathMutationMutation,
    UserRemoveAlbumPathMutationMutationVariables
  >(USER_REMOVE_ALBUM_PATH_MUTATION, {
    refetchQueries: [
      {
        query: USERS_QUERY,
      },
    ],
  })

  return (
    <li className="flex justify-between">
      <span>{album.filePath}</span>
      <Button
        variant="negative"
        disabled={loading}
        onClick={() =>
          void removeAlbumPath({
            variables: {
              userId: user.id,
              albumId: album.id,
            },
          }).catch(error => {
            console.error('Failed to remove root path: ', error)
          })
        }
      >
        {t('general.action.remove', 'Remove')}
      </Button>
    </li>
  )
}

type EditNewRootPathProps = {
  userID: string
}

const EditNewRootPath = ({ userID }: EditNewRootPathProps) => {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [addRootPath, { loading }] = useMutation<UserAddRootPathMutation>(
    USER_ADD_ROOT_PATH_MUTATION,
    {
      refetchQueries: [
        {
          query: USERS_QUERY,
        },
      ],
    }
  )

  return (
    <li className="flex gap-1 mt-2">
      <TextField
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setValue(e.target.value)
        }
        disabled={loading}
      />
      <Button
        variant="positive"
        disabled={loading}
        onClick={() => {
          const rootPath = normalizePath(value)
          if (rootPath === '') return
          void addRootPath({
            variables: {
              id: userID,
              rootPath,
            },
          }).then(() => {
            setValue('')
          }).catch(error => {
            console.error('Failed to add root path: ', error)
          })
        }}
      >
        {t('general.action.add', 'Add')}
      </Button>
    </li>
  )
}

type EditRootPathsProps = {
  user: SettingsUsersQueryQuery['user'][0]
}

export const EditRootPaths = ({ user }: EditRootPathsProps) => {
  const editRows = user.rootAlbums.map(album => (
    <EditRootPath key={album.id} album={album} user={user} />
  ))

  return (
    <ul>
      {editRows}
      <EditNewRootPath userID={user.id} />
    </ul>
  )
}
