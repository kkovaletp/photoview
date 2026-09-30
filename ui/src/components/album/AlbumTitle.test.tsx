import { afterEach, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { gql } from '@apollo/client'
import type { MockLink } from '@apollo/client/testing'
import { clearTokenCookie, saveTokenCookie } from '../../helpers/authentication'
import { renderWithProviders } from '../../helpers/testUtils'
import AlbumTitle from './AlbumTitle'

afterEach(() => {
  clearTokenCookie()
})

test('loads the breadcrumb path for an authenticated, unlinked album title', async () => {
  saveTokenCookie('test-token')
  const result = vi.fn(() => ({
    data: {
      album: {
        __typename: 'Album' as const,
        id: '42',
        path: [{ __typename: 'Album' as const, id: '1', title: 'Parent album' }],
      },
    },
  }))
  const mocks: MockLink.MockedResponse[] = [
    {
      request: {
        query: gql`
          query albumPathQuery($id: ID!) {
            album(id: $id) {
              id
              path {
                id
                title
              }
            }
          }
        `,
        variables: { id: '42' },
      },
      result,
    },
  ]

  renderWithProviders(
    <AlbumTitle album={{ id: '42', title: 'Current album' }} disableLink />,
    { mocks }
  )

  expect(screen.getByRole('heading', { name: 'Current album' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Current album' })).not.toBeInTheDocument()
  expect(await screen.findByRole('link', { name: 'Parent album' })).toHaveAttribute(
    'href',
    '/album/1'
  )
  await waitFor(() => expect(result).toHaveBeenCalledTimes(1))
})
