import { useState, ChangeEvent } from 'react'
import { gql, useMutation } from '@apollo/client'
import { USERS_QUERY } from './UsersTable'
import { useTranslation } from 'react-i18next'
import {
  UserRemoveAlbumPathMutationMutation,
  UserRemoveAlbumPathMutationMutationVariables,
  UserAddRootPathMutation,
  UserAddRootPathMutationVariables,
} from './__generated__/EditUserRowRootPaths'
import { SettingsUsersQueryQuery } from './__generated__/UsersTable'
import { Button, TextField } from '../../../primitives/form/Input'
import MessageBox from '../../../primitives/form/MessageBox'
import { normalizePath } from '../../../helpers/normalize'

const USER_REMOVE_ALBUM_PATH_MUTATION = gql`
  mutation userRemoveAlbumPathMutation($userId: ID!, $albumId: ID!) {
    userRemoveRootAlbum(userId: $userId, albumId: $albumId) {
      id
    }
  }
`

export const USER_ADD_ROOT_PATH_MUTATION = gql`
  mutation userAddRootPath($id: ID!, $rootPath: String!) {
    userAddRootPath(id: $id, rootPath: $rootPath) {
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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
    <li className="flex flex-col">
      <div className="flex justify-between">
        <span>{album.filePath}</span>
        <Button
          variant="negative"
          disabled={loading}
          onClick={async () => {
            setErrorMessage(null)
            try {
              await removeAlbumPath({
                variables: {
                  userId: user.id,
                  albumId: album.id,
                },
              })
            } catch (error) {
              console.error('Failed to remove root path: ', error)
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : t(
                    'settings.users.edit.remove_path_error',
                    'Failed to remove path. Please try again.'
                  )
              )
            }
          }}
        >
          {t('general.action.remove', 'Remove')}
        </Button>
      </div>
      <MessageBox type="negative" message={errorMessage} show={!!errorMessage} />
    </li>
  )
}

type EditNewRootPathProps = {
  userID: string
}

const EditNewRootPath = ({ userID }: EditNewRootPathProps) => {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [addRootPath, { loading }] = useMutation<
    UserAddRootPathMutation,
    UserAddRootPathMutationVariables
  >(USER_ADD_ROOT_PATH_MUTATION, {
    refetchQueries: [
      {
        query: USERS_QUERY,
      },
    ],
  })

  return (
    <li className="flex flex-col mt-2">
      <div className="flex gap-1">
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
          onClick={async () => {
            const rootPath = normalizePath(value)
            if (rootPath === '') return
            setErrorMessage(null)
            try {
              await addRootPath({
                variables: {
                  id: userID,
                  rootPath,
                },
              })
              setValue('')
            } catch (error) {
              console.error('Failed to add root path: ', error)
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : t(
                    'settings.users.edit.add_path_error',
                    'Failed to add path. Please try again.'
                  )
              )
            }
          }}
        >
          {t('general.action.add', 'Add')}
        </Button>
      </div>
      <MessageBox type="negative" message={errorMessage} show={!!errorMessage} />
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
