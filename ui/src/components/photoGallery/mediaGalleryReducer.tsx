import { Dispatch } from 'react'
import { MediaGalleryFieldsFragment } from './__generated__/fragments'

export interface MediaGalleryState {
  presenting: boolean
  activeIndex: number
  media: MediaGalleryFieldsFragment[]
}

export type GalleryAction =
  | { type: 'nextImage' }
  | { type: 'previousImage' }
  | { type: 'closePresentMode' }

export type PhotoGalleryAction =
  | GalleryAction
  | { type: 'openPresentMode'; activeIndex: number }
  | { type: 'selectImage'; index: number }
  | { type: 'replaceMedia'; media: MediaGalleryFieldsFragment[] }
  | { type: 'replaceAlbumMedia'; media: MediaGalleryFieldsFragment[] }

export function mediaGalleryReducer(
  state: MediaGalleryState,
  action: PhotoGalleryAction
): MediaGalleryState {
  switch (action.type) {
    case 'nextImage':
      return {
        ...state,
        activeIndex: (state.activeIndex + 1) % state.media.length,
      }
    case 'previousImage':
      if (state.activeIndex <= 0) {
        return {
          ...state,
          activeIndex: state.media.length - 1,
        }
      } else {
        return {
          ...state,
          activeIndex: state.activeIndex - 1,
        }
      }
    case 'openPresentMode':
      if (
        !Number.isInteger(action.activeIndex) ||
        action.activeIndex < 0 ||
        action.activeIndex >= state.media.length
      ) {
        return state
      }

      return {
        ...state,
        presenting: true,
        activeIndex: action.activeIndex,
      }
    case 'closePresentMode':
      return {
        ...state,
        presenting: false,
      }
    case 'selectImage':
      return {
        ...state,
        activeIndex: Math.max(
          0,
          Math.min(state.media.length - 1, action.index)
        ),
      }
    case 'replaceMedia':
      return {
        ...state,
        media: action.media,
        activeIndex: -1,
        presenting: false,
      }
    case 'replaceAlbumMedia': {
      const activeId = state.presenting
        ? state.media[state.activeIndex]?.id
        : undefined

      const activeIndex =
        activeId === undefined
          ? -1
          : action.media.findIndex(media => media.id === activeId)

      return {
        ...state,
        media: action.media,
        activeIndex,
        presenting: activeIndex !== -1,
      }
    }
  }
}

export const openPresentModeAction = ({ dispatchMedia, activeIndex }: {
  dispatchMedia: Dispatch<PhotoGalleryAction>
  activeIndex: number
}) => {
  dispatchMedia({ type: 'openPresentMode', activeIndex })
}

export const closePresentModeAction = ({ dispatchMedia }: {
  dispatchMedia: Dispatch<GalleryAction>
}) => {
  dispatchMedia({ type: 'closePresentMode' })
}
