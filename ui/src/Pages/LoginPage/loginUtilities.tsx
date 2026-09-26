import { gql, type TypedDocumentNode } from '@apollo/client'
import { saveTokenCookie } from '../../helpers/authentication'
import styled from 'styled-components'
import {
  CheckInitialSetupQuery,
  CheckInitialSetupQueryVariables,
} from './__generated__/loginUtilities'

export const INITIAL_SETUP_QUERY: TypedDocumentNode<
  CheckInitialSetupQuery,
  CheckInitialSetupQueryVariables
> = gql`
  query CheckInitialSetup {
    siteInfo {
      initialSetup
    }
  }
`

export function login(token: string) {
  saveTokenCookie(token)
  globalThis.location.href = `${import.meta.env.BASE_URL}`
}

export const Container = styled.div.attrs({ className: 'mt-20' })``
