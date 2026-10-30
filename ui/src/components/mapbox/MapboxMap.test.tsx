import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as mapboxgl from 'mapbox-gl/esm'
import * as mapboxLibrary from 'mapbox-gl/esm'
import useMapboxMap from './MapboxMap'

vi.mock('@apollo/client/react', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@apollo/client/react')>()

  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: { mapboxToken: 'test-token' },
    })),
  }
})

vi.mock('mapbox-gl/esm', () => ({
  Map: vi.fn(function () {
    return {
      resize: vi.fn(),
      remove: vi.fn(),
    }
  }),
  setWorkerUrl: vi.fn(),
}))

vi.mock('../../theme', () => ({
  isDarkMode: () => false,
}))

vi.mock('../../localization', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../localization')>()

  return {
    ...actual,
    SetMapLanguages: vi.fn(),
  }
})

type ConfigureMap = (
  map: mapboxgl.Map,
  library: typeof mapboxgl
) => void

function TestMap({ configureMapbox }: { configureMapbox: ConfigureMap }) {
  const { mapContainer } = useMapboxMap({ configureMapbox })
  return mapContainer
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('useMapboxMap lifecycle', () => {
  test('keeps the map on rerender and removes it on unmount', async () => {
    const configureMapbox = vi.fn<ConfigureMap>()
    const view = render(<TestMap configureMapbox={configureMapbox} />)

    await waitFor(() => {
      expect(configureMapbox).toHaveBeenCalledOnce()
    })

    const map = configureMapbox.mock.calls[0][0]

    view.rerender(
      <TestMap configureMapbox={vi.fn<ConfigureMap>()} />
    )

    expect(mapboxLibrary.Map).toHaveBeenCalledOnce()
    expect(map.remove).not.toHaveBeenCalled()

    view.unmount()

    expect(map.remove).toHaveBeenCalledOnce()
  })

  test('does not create a map after its owner has unmounted', async () => {
    const configureMapbox = vi.fn<ConfigureMap>()
    const view = render(<TestMap configureMapbox={configureMapbox} />)

    view.unmount()

    await act(async () => { })

    expect(mapboxLibrary.Map).not.toHaveBeenCalled()
    expect(configureMapbox).not.toHaveBeenCalled()
  })
})
