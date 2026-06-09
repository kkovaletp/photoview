import { gql, useMutation } from '@apollo/client'
import { useState, ChangeEvent, Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import Checkbox from '../../../primitives/form/Checkbox'
import { TextField, Button, ButtonGroup } from '../../../primitives/form/Input'
import MessageBox from '../../../primitives/form/MessageBox'
import { TableRow, TableCell } from '../../../primitives/Table'
import { normalizePath, normalizeUsername } from '../../../helpers/normalize'
import {
  CreateUserMutation,
  CreateUserMutationVariables,
} from './__generated__/AddUserRow'

export const CREATE_USER_MUTATION = gql`
  mutation createUser($username: String!, $admin: Boolean!, $rootPath: String) {
    createUser(username: $username, admin: $admin, rootPath: $rootPath) {
      id
      username
      admin
      __typename
    }
  }
`

const initialState = {
  username: '',
  rootPath: '',
  admin: false,
}

type AddUserRowProps = {
  setShow: Dispatch<SetStateAction<boolean>>
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

  const [createUser, { loading }] = useMutation<
    CreateUserMutation,
    CreateUserMutationVariables
  >(CREATE_USER_MUTATION)

  const handleAddUser = async () => {
    setErrorMessage(null)
    try {
      const username = normalizeUsername(state.username)
      if (username === '') {
        setErrorMessage(
          t('login_page.field.username_error', 'Please enter a username')
        )
        return
      }

      const rootPath = normalizePath(state.rootPath) || undefined

      await createUser({
        variables: {
          username,
          admin: state.admin,
          rootPath,
        },
      })

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
    event: ChangeEvent<HTMLInputElement>,
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
