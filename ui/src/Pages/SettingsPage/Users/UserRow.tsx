import { useState, Dispatch, SetStateAction } from 'react'
import { ApolloLink, gql } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import EditUserRow from './EditUserRow'
import ViewUserRow from './ViewUserRow'
import { SettingsUsersQueryQuery } from './__generated__/UsersTable'
import {
  ScanUserMutation, ScanUserMutationVariables,
  UpdateUserMutation, UpdateUserMutationVariables,
  DeleteUserMutation, DeleteUserMutationVariables,
} from './__generated__/UserRow'
import { useNotifyError } from '../../../hooks/useNotifyError'

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

type UserBase = SettingsUsersQueryQuery['user'][0]
interface UserRowState extends UserBase {
  editing: boolean
  newRootPath: string
  oldState?: Omit<UserRowState, 'oldState'>
}

//TODO: How to fix this:
// Type 'VariablesType' does not satisfy the constraint 'OperationVariables'.
// UserRow.tsx(50, 37): This type parameter might need an `extends OperationVariables` constraint.
type ApolloMutationFn<MutationType, VariablesType> = (
  options?: useMutation.MutationFunctionOptions<MutationType, VariablesType>
) => Promise<ApolloLink.Result<MutationType>>

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

const UserRow = ({ user, refetchUsers }: UserRowProps) => {
  const notifyError = useNotifyError()
  const [state, setState] = useState<UserRowState>({
    ...user,
    editing: false,
    newRootPath: '',
  })

  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  //TODO: Replace deprecated `useMutation`:
  /*
              * @deprecated Avoid manually specifying generics on `useMutation`.
              * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your mutation results.
              */
  const [updateUserMutationFn, { loading: updateUserLoading }] = useMutation<
    UpdateUserMutation,
    UpdateUserMutationVariables
  >(updateUserMutation)

  //TODO: Replace deprecated `useMutation`:
  /*
              * @deprecated Avoid manually specifying generics on `useMutation`.
              * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your mutation results.
              */
  const [deleteUserMutationFn] = useMutation<DeleteUserMutation, DeleteUserMutationVariables>(deleteUserMutation)

  //TODO: Replace deprecated `useMutation`:
  /*
              * @deprecated Avoid manually specifying generics on `useMutation`.
              * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your mutation results.
              */
  const [scanUserMutationFn, { called: scanUserCalled }] = useMutation<
    ScanUserMutation,
    ScanUserMutationVariables
  >(scanUserMutation)

  const updateUser: ApolloMutationFn<UpdateUserMutation, UpdateUserMutationVariables> = async (
    options
  ) => {
    try {
      //TODO: How to fix this type mismatch:
      /*
Argument of type 'MutationFunctionOptions<UpdateUserMutation, Exact<{ id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }>, ApolloCache> | undefined' is not assignable to parameter of type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ ...; }>> & { ...; } & { ...; }'.
  Type 'undefined' is not assignable to type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ ...; }>> & { ...; } & { ...; }'.
    Type 'undefined' is not assignable to type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ id: string | number; username?: string | ... 1 more ... | undefined; admin?: boolean | ... 1 more ... | undefined; }>>'.
      */
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
      notifyError('Failed to update user', error)
      return { data: undefined, errors: undefined } as ApolloLink.Result<UpdateUserMutation>
    }
  }

  const deleteUser: ApolloMutationFn<DeleteUserMutation, DeleteUserMutationVariables> = async (
    options
  ) => {
    try {
      //TODO: How to fix this type mismatch:
      /*
Argument of type 'MutationFunctionOptions<UpdateUserMutation, Exact<{ id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }>, ApolloCache> | undefined' is not assignable to parameter of type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ ...; }>> & { ...; } & { ...; }'.
  Type 'undefined' is not assignable to type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ ...; }>> & { ...; } & { ...; }'.
    Type 'undefined' is not assignable to type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ id: string | number; username?: string | ... 1 more ... | undefined; admin?: boolean | ... 1 more ... | undefined; }>>'.
      */
      const result = await deleteUserMutationFn(options)
      const deletedUser = result.data?.deleteUser
      if (deletedUser) {
        refetchUsers()
      }
      return result
    } catch (error) {
      console.error('Failed to delete user: ', error)
      notifyError('Failed to delete user', error)
      return { data: undefined, errors: undefined } as ApolloLink.Result<DeleteUserMutation>
    }
  }

  const scanUser: ApolloMutationFn<ScanUserMutation, ScanUserMutationVariables> = async (
    options
  ) => {
    try {
      //TODO: How to fix this type mismatch:
      /*
Argument of type 'MutationFunctionOptions<UpdateUserMutation, Exact<{ id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }>, ApolloCache> | undefined' is not assignable to parameter of type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ ...; }>> & { ...; } & { ...; }'.
  Type 'undefined' is not assignable to type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ ...; }>> & { ...; } & { ...; }'.
    Type 'undefined' is not assignable to type 'Options<UpdateUserMutation, { id: string | number; username?: string | null | undefined; admin?: boolean | null | undefined; }, ApolloCache, Partial<{ id: string | number; username?: string | ... 1 more ... | undefined; admin?: boolean | ... 1 more ... | undefined; }>>'.
      */
      const result = await scanUserMutationFn(options)
      const scanResult = result.data?.scanUser
      if (scanResult) {
        refetchUsers()
      }
      return result
    } catch (error) {
      console.error('Failed to scan user: ', error)
      notifyError('Failed to scan user', error)
      return { data: undefined, errors: undefined } as ApolloLink.Result<ScanUserMutation>
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
    setChangePassword: setShowChangePassword,
    setConfirmDelete: setShowConfirmDelete,
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
