import { useLazyQuery } from '@apollo/client'
import { useEffect, JSX, ReactNode } from 'react'
import { Navigate } from 'react-router'
import { authToken } from '../../helpers/authentication'
import { AdminQueryQuery } from '../layout/__generated__/Layout'
import { ADMIN_QUERY } from '../layout/Layout'

export const useIsAdmin = () => {
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
