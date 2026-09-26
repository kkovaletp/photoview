import { gql } from '@apollo/client'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { OrderDirection } from '../../__generated__/globalTypes'
import { renderWithProviders } from '../../helpers/testUtils'
import AlbumsPage from './AlbumsPage'

const GET_MY_ALBUMS = gql`
  query getMyAlbums($orderBy: String, $orderDirection: OrderDirection) {
    myAlbums(
      order: { order_by: $orderBy, order_direction: $orderDirection }
      onlyRoot: true
      showEmpty: true
    ) {
      id
      title
      thumbnail {
        id
        thumbnail {
          url
        }
      }
    }
  }
`

test('requests albums with the selected ordering variables', async () => {
  const user = userEvent.setup()
  const initialResult = vi.fn(() => ({ data: { myAlbums: [] } }))
  const titleResult = vi.fn(() => ({ data: { myAlbums: [] } }))
  const sortedResult = vi.fn(() => ({ data: { myAlbums: [] } }))

  renderWithProviders(<AlbumsPage />, {
    mocks: [
      {
        request: {
          query: GET_MY_ALBUMS,
          variables: {
            orderBy: 'updated_at',
            orderDirection: OrderDirection.Asc,
          },
        },
        result: initialResult,
      },
      {
        request: {
          query: GET_MY_ALBUMS,
          variables: { orderBy: 'title', orderDirection: OrderDirection.Asc },
        },
        result: titleResult,
      },
      {
        request: {
          query: GET_MY_ALBUMS,
          variables: { orderBy: 'title', orderDirection: OrderDirection.Desc },
        },
        result: sortedResult,
      },
    ],
  })

  await waitFor(() => expect(initialResult).toHaveBeenCalledOnce())
  await user.selectOptions(screen.getByRole('combobox'), 'title')
  await waitFor(() => expect(titleResult).toHaveBeenCalledOnce())
  await user.click(screen.getByRole('button', { name: 'Sort direction' }))

  await waitFor(() => expect(sortedResult).toHaveBeenCalledOnce())
})
