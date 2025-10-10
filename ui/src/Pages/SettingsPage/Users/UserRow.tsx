import React, { useState } from 'react'
import {
  FetchResult,
  gql,
  MutationFunctionOptions,
  useMutation,
} from '@apollo/client'
import EditUserRow from './EditUserRow'
import ViewUserRow from './ViewUserRow'
import { settingsUsersQuery_user } from './__generated__/settingsUsersQuery'
import { scanUser, scanUserVariables } from './__generated__/scanUser'
import { updateUser, updateUserVariables } from './__generated__/updateUser'
import { deleteUser, deleteUserVariables } from './__generated__/deleteUser'

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

interface UserRowState extends settingsUsersQuery_user {
  editing: boolean
  newRootPath: string
  oldState?: Omit<UserRowState, 'oldState'>
}

type ApolloMutationFn<MutationType, VariablesType> = (
  options?: MutationFunctionOptions<MutationType, VariablesType>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<FetchResult<MutationType, any, any>>

export type UserRowChildProps = {
  user: settingsUsersQuery_user
  state: UserRowState
  setState: React.Dispatch<React.SetStateAction<UserRowState>>
  scanUser: ApolloMutationFn<scanUser, scanUserVariables>
  updateUser: ApolloMutationFn<updateUser, updateUserVariables>
  updateUserLoading: boolean
  deleteUser: ApolloMutationFn<deleteUser, deleteUserVariables>
  setChangePassword: React.Dispatch<React.SetStateAction<boolean>>
  setConfirmDelete: React.Dispatch<React.SetStateAction<boolean>>
  scanUserCalled: boolean
  showChangePassword: boolean
  showConfirmDelete: boolean
}

export type UserRowProps = {
  user: settingsUsersQuery_user
  refetchUsers: () => void
}

const UserRow = ({ user, refetchUsers }: UserRowProps) => {
  const [state, setState] = useState<UserRowState>({
    ...user,
    editing: false,
    newRootPath: '',
  })

  const [showConfirmDelete, setConfirmDelete] = useState(false)
  const [showChangePassword, setChangePassword] = useState(false)
  const [updateUserMutationFn, { loading: updateUserLoading }] = useMutation<
    updateUser,
    updateUserVariables
  >(updateUserMutation)

  const [deleteUserMutationFn] = useMutation<deleteUser, deleteUserVariables>(deleteUserMutation)

  const [scanUserMutationFn, { called: scanUserCalled }] = useMutation<
    scanUser,
    scanUserVariables
  >(scanUserMutation)

  const updateUser: ApolloMutationFn<updateUser, updateUserVariables> = async (
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
      throw error
    }
  }

  const deleteUser: ApolloMutationFn<deleteUser, deleteUserVariables> = async (
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
      throw error
    }
  }

  const scanUser: ApolloMutationFn<scanUser, scanUserVariables> = async (
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
      throw error
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
