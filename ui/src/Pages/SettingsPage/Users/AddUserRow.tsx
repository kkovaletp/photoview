import { gql, useMutation } from '@apollo/client'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Checkbox from '../../../primitives/form/Checkbox'
import { TextField, Button, ButtonGroup } from '../../../primitives/form/Input'
import { TableRow, TableCell } from '../../../primitives/Table'
import { createUser, createUserVariables } from './__generated__/createUser'
import {
  userAddRootPath,
  userAddRootPathVariables,
} from './__generated__/userAddRootPath'
import MessageBox from '../../../primitives/form/MessageBox'

export const CREATE_USER_MUTATION = gql`
  mutation createUser($username: String!, $admin: Boolean!) {
    createUser(username: $username, admin: $admin) {
      id
      username
      admin
      __typename
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

const initialState = {
  username: '',
  rootPath: '',
  admin: false,
  userAdded: false,
}

type AddUserRowProps = {
  setShow: React.Dispatch<React.SetStateAction<boolean>>
  show: boolean
  onUserAdded(): void
}

const AddUserRow = ({ setShow, show, onUserAdded }: AddUserRowProps) => {
  const { t } = useTranslation()
  const [state, setState] = useState(initialState)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const finished = () => {
    setState(initialState)
    setErrorMessage(null)
    onUserAdded()
  }

  const [addRootPath, { loading: addRootPathLoading }] = useMutation<
    userAddRootPath,
    userAddRootPathVariables
  >(USER_ADD_ROOT_PATH_MUTATION)

  const [createUser, { loading: createUserLoading }] = useMutation<
    createUser,
    createUserVariables
  >(CREATE_USER_MUTATION)

  const loading = addRootPathLoading || createUserLoading

  const handleAddUser = async () => {
    setErrorMessage(null)
    try {
      const result = await createUser({
        variables: {
          username: state.username,
          admin: state.admin,
        },
      })

      if (result.data?.createUser?.id && state.rootPath) {
        await addRootPath({
          variables: {
            id: result.data.createUser.id,
            rootPath: state.rootPath,
          },
        })
      }

      finished()
    } catch (error) {
      console.error('Error adding user: ', error)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settings.users.add_user.error', 'Failed to add user. Please try again.')
      )
    }
  }

  function updateInput(
    event: React.ChangeEvent<HTMLInputElement>,
    key: string
  ) {
    setState({
      ...state,
      [key]: event.target.value,
    })
  }

  if (!show) {
    return null
  }

  return (
    <TableRow>
      <TableCell>
        <TextField
          placeholder={t('login_page.field.username', 'Username')}
          value={state.username}
          onChange={e => updateInput(e, 'username')}
        />
      </TableCell>
      <TableCell>
        <TextField
          placeholder={t(
            'login_page.initial_setup.field.photo_path.placeholder',
            '/path/to/photos'
          )}
          value={state.rootPath}
          onChange={e => updateInput(e, 'rootPath')}
        />
      </TableCell>
      <TableCell>
        <Checkbox
          label="Admin"
          checked={state.admin}
          onChange={e => {
            setState({
              ...state,
              admin: e.target.checked || false,
            })
          }}
        />
      </TableCell>
      <TableCell>
        <MessageBox
          type="negative"
          message={errorMessage}
          show={!!errorMessage}
        />
        <ButtonGroup>
          <Button variant="negative" onClick={() => setShow(false)}>
            {t('general.action.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            variant="positive"
            onClick={handleAddUser}
          >
            {t('settings.users.add_user.submit', 'Add user')}
          </Button>
        </ButtonGroup>
      </TableCell>
    </TableRow>
  )
}

export default AddUserRow
