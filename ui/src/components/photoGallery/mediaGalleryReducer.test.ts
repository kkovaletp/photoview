import { describe, expect, test } from 'vitest'
import { MediaType } from '../../__generated__/globalTypes'
import {
  mediaGalleryReducer,
  type MediaGalleryState,
} from './mediaGalleryReducer'

const media = (id: string): MediaGalleryState['media'][number] => ({
  __typename: 'Media',
  id,
  type: MediaType.Photo,
  thumbnail: null,
  highRes: null,
  videoWeb: null,
  blurhash: null,
  favorite: false,
})

describe('replaceAlbumMedia', () => {
  test('keeps the open media and navigates using the replacement list', () => {
    const [a, b, c] = [media('a'), media('b'), media('c')]
    const state: MediaGalleryState = {
      media: [a, b, c],
      activeIndex: 1,
      presenting: true,
    }

    const replaced = mediaGalleryReducer(state, {
      type: 'replaceAlbumMedia',
      media: [c, a, b],
    })

    expect(replaced.presenting).toBe(true)
    expect(replaced.activeIndex).toBe(2)
    expect(replaced.media[replaced.activeIndex].id).toBe('b')

    const next = mediaGalleryReducer(replaced, { type: 'nextImage' })
    expect(next.media[next.activeIndex].id).toBe('c')

    const previous = mediaGalleryReducer(next, { type: 'previousImage' })
    expect(previous.media[previous.activeIndex].id).toBe('b')
  })

  test('closes the viewer when the open media is removed', () => {
    const [a, b] = [media('a'), media('b')]
    const state: MediaGalleryState = {
      media: [a, b],
      activeIndex: 1,
      presenting: true,
    }

    const result = mediaGalleryReducer(state, {
      type: 'replaceAlbumMedia',
      media: [a],
    })

    expect(result.media).toEqual([a])
    expect(result.presenting).toBe(false)
    expect(result.activeIndex).toBe(-1)
  })

  test('clears the selection when replacement occurs while closed', () => {
    const a = media('a')
    const state: MediaGalleryState = {
      media: [a],
      activeIndex: 0,
      presenting: false,
    }

    const result = mediaGalleryReducer(state, {
      type: 'replaceAlbumMedia',
      media: [a],
    })

    expect(result.presenting).toBe(false)
    expect(result.activeIndex).toBe(-1)
  })
})
