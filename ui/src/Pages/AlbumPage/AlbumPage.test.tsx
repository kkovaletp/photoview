import { MockedProvider } from '@apollo/client/testing'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AlbumPage from './AlbumPage'
import { renderWithProviders } from '../../helpers/testUtils'
import { gql } from '@apollo/client'

vi.mock('../../hooks/useScrollPagination')

// Define the album query based on the error message
const ALBUM_QUERY = gql`
  fragment MediaGalleryFields on Media {
    id
    type
    blurhash
    thumbnail {
      url
      width
      height
    }
    highRes {
      url
    }
    videoWeb {
      url
    }
    favorite
  }

  fragment AlbumGalleryFields on Album {
    id
    title
    subAlbums(order: {order_by: "title", order_direction: $orderDirection}) {
      id
      title
      thumbnail {
        id
        thumbnail {
          url
        }
      }
    }
    media(
      paginate: {limit: $limit, offset: $offset}
      order: {order_by: $mediaOrderBy, order_direction: $orderDirection}
      onlyFavorites: $onlyFavorites
    ) {
      ...MediaGalleryFields
    }
  }

  query albumQuery($id: ID!, $onlyFavorites: Boolean, $mediaOrderBy: String, $orderDirection: OrderDirection, $limit: Int, $offset: Int) {
    album(id: $id) {
      ...AlbumGalleryFields
    }
  }
`;

// Create a mock with the expected structure
const mockAlbumQuery = {
  request: {
    query: ALBUM_QUERY,
    variables: {
      id: "1",
      onlyFavorites: false,
      mediaOrderBy: "date_shot",
      orderDirection: "ASC",
      offset: 0,
      limit: 200
    }
  },
  result: {
    data: {
      album: {
        id: "1",
        title: "Test Album",
        subAlbums: [],
        media: []
      }
    }
  }
};

test('AlbumPage renders', () => {
  renderWithProviders(<AlbumPage />, {
    mocks: [mockAlbumQuery],
    initialEntries: ['/album/1'],
    path: "/album/:id",
    route: <AlbumPage />
  })

  expect(screen.getByText('Sort')).toBeInTheDocument()
  expect(screen.getByLabelText('Sort direction')).toBeInTheDocument()
})
