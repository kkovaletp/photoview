import { useState, Dispatch, SetStateAction } from 'react'
import {
  FetchResult,
  gql,
  MutationFunctionOptions,
  useMutation,
} from '@apollo/client'
import EditUserRow from './EditUserRow'
import ViewUserRow from './ViewUserRow'
import { SettingsUsersQueryQuery } from './__generated__/UsersTable'
import {
  ScanUserMutation, ScanUserMutationVariables,
  UpdateUserMutation, UpdateUserMutationVariables,
  DeleteUserMutation, DeleteUserMutationVariables,
} from './__generated__/UserRow'
import { useMessageState } from '../../../components/messages/MessageState'
import { NotificationType } from '../../../__generated__/globalTypes'

const updateUserMutation = gql`
  mutation updateUser($id: ID!, $username: String, $admin: Boolean) {
    updateUser(id: $id, username: $username, admin: $admin) {
      id
      username
      admin
    }
  }
`

const deleteUserMutation = gql`
  mutation deleteUser($id: ID!) {
    deleteUser(id: $id) {
      id
      username
    }
  }
`

const scanUserMutation = gql`
  mutation scanUser($userId: ID!) {
    scanUser(userId: $userId) {
      success
    }
  }
`

//TODO: how to fix the "An interface can only extend an identifier/qualified-name with optional type arguments" error?
interface UserRowState extends SettingsUsersQueryQuery['user'][0] {
  editing: boolean
  newRootPath: string
  oldState?: Omit<UserRowState, 'oldState'>
}

type ApolloMutationFn<MutationType, VariablesType> = (
  options?: MutationFunctionOptions<MutationType, VariablesType>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<FetchResult<MutationType, any, any>>

export type UserRowChildProps = {
  user: SettingsUsersQueryQuery['user'][0]
  state: UserRowState
  setState: Dispatch<SetStateAction<UserRowState>>
  scanUser: ApolloMutationFn<ScanUserMutation, ScanUserMutationVariables>
  updateUser: ApolloMutationFn<UpdateUserMutation, UpdateUserMutationVariables>
  updateUserLoading: boolean
  deleteUser: ApolloMutationFn<DeleteUserMutation, DeleteUserMutationVariables>
  setChangePassword: Dispatch<SetStateAction<boolean>>
  setConfirmDelete: Dispatch<SetStateAction<boolean>>
  scanUserCalled: boolean
  showChangePassword: boolean
  showConfirmDelete: boolean
}

export type UserRowProps = {
  user: SettingsUsersQueryQuery['user'][0]
  refetchUsers: () => void
}

function notifyMutationError(
  add: ReturnType<typeof useMessageState>['add'],
  header: string,
  err: unknown
) {
  add({
    key: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36)),
    type: NotificationType.Message,
    props: {
      negative: true,
      header,
      content: err instanceof Error ? err.message : 'An unexpected error occurred',
    },
  })
}

const UserRow = ({ user, refetchUsers }: UserRowProps) => {
  const { add } = useMessageState()
  const [state, setState] = useState<UserRowState>({
    ...user,
    editing: false,
    newRootPath: '',
  })

  const [showConfirmDelete, setConfirmDelete] = useState(false)
  const [showChangePassword, setChangePassword] = useState(false)
  const [updateUserMutationFn, { loading: updateUserLoading }] = useMutation<
    UpdateUserMutation,
    UpdateUserMutationVariables
  >(updateUserMutation)

  const [deleteUserMutationFn] = useMutation<DeleteUserMutation, DeleteUserMutationVariables>(deleteUserMutation)

  const [scanUserMutationFn, { called: scanUserCalled }] = useMutation<
    ScanUserMutation,
    ScanUserMutationVariables
  >(scanUserMutation)

  const updateUser: ApolloMutationFn<UpdateUserMutation, UpdateUserMutationVariables> = async (
    options
  ) => {
    try {
      const result = await updateUserMutationFn(options)
      const updatedUser = result.data?.updateUser
      if (updatedUser) {
        setState(state => ({
          ...state,
          ...updatedUser,
          editing: false,
        }))
        refetchUsers()
      }
      return result
    } catch (error) {
      console.error('Failed to update user: ', error)
      notifyMutationError(add, 'Failed to update user', error)
      return {} as FetchResult<UpdateUserMutation>
    }
  }

  const deleteUser: ApolloMutationFn<DeleteUserMutation, DeleteUserMutationVariables> = async (
    options
  ) => {
    try {
      const result = await deleteUserMutationFn(options)
      const deletedUser = result.data?.deleteUser
      if (deletedUser) {
        refetchUsers()
      }
      return result
    } catch (error) {
      console.error('Failed to delete user: ', error)
      notifyMutationError(add, 'Failed to delete user', error)
      return {} as FetchResult<DeleteUserMutation>
    }
  }

  const scanUser: ApolloMutationFn<ScanUserMutation, ScanUserMutationVariables> = async (
    options
  ) => {
    try {
      const result = await scanUserMutationFn(options)
      const scanResult = result.data?.scanUser
      if (scanResult) {
        refetchUsers()
      }
      return result
    } catch (error) {
      console.error('Failed to scan user: ', error)
      notifyMutationError(add, 'Failed to scan user', error)
      return {} as FetchResult<ScanUserMutation>
    }
  }

  const props: UserRowChildProps = {
    user,
    state,
    setState,
    scanUser,
    updateUser,
    updateUserLoading,
    deleteUser,
    setChangePassword,
    setConfirmDelete,
    scanUserCalled,
    showChangePassword,
    showConfirmDelete,
  }

  if (state.editing) {
    return <EditUserRow {...props} />
  }

  return <ViewUserRow {...props} />
}

export default UserRow
