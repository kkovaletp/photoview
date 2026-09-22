import { useLazyQuery } from '@apollo/client/react'
import { useEffect, JSX, ReactNode } from 'react'
import { Navigate } from 'react-router'
import { authToken } from '../../helpers/authentication'
import { AdminQueryQuery } from '../layout/__generated__/Layout'
import { ADMIN_QUERY } from '../layout/Layout'

export const useIsAdmin = () => {
  //TODO: Replace deprecated `useLazyQuery`
  // @deprecated Avoid manually specifying generics on `useLazyQuery`.
  // * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your query results.
  const [fetchAdminQuery, { data, called }] =
    useLazyQuery<AdminQueryQuery>(ADMIN_QUERY)
  const token = authToken()

  useEffect(() => {
    if (token && !called) {
      fetchAdminQuery()
    }
  }, [token, called, fetchAdminQuery])

  if (!token) {
    return false
  }

  return data?.myUser?.admin
}

export const Authorized = ({ children }: { children: JSX.Element }) => {
  const token = authToken()

  return token ? children : null
}

interface AuthorizedRouteProps {
  children: ReactNode
}

const AuthorizedRoute = ({ children }: AuthorizedRouteProps) => {
  const token = authToken()

  if (!token) {
    return <Navigate to="/" />
  }

  return <>{children}</>
}

export default AuthorizedRoute
