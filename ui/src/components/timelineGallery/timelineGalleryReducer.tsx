import { Dispatch } from 'react'
import { DateTime } from 'luxon'
import { MyTimelineQuery } from './__generated__/TimelineGallery'
import { TimelineGroup, TimelineGroupAlbum } from './TimelineGallery'
import { GalleryAction } from '../photoGallery/mediaGalleryReducer'

export interface TimelineMediaIndex {
  date: number
  album: number
  media: number
}

export interface TimelineGalleryState {
  presenting: boolean
  timelineGroups: TimelineGroup[]
  activeIndex: TimelineMediaIndex
}

export type TimelineGalleryAction =
  | GalleryAction
  | { type: 'replaceTimelineGroups'; timeline: MyTimelineQuery['myTimeline'] }
  | { type: 'selectImage'; index: TimelineMediaIndex }
  | { type: 'openPresentMode'; activeIndex: TimelineMediaIndex }

export function timelineGalleryReducer(
  state: TimelineGalleryState,
  action: TimelineGalleryAction
): TimelineGalleryState {
  switch (action.type) {
    case 'replaceTimelineGroups': {
      const timelineGroups = convertMediaToTimelineGroups(action.timeline)

      return {
        ...state,
        activeIndex: {
          album: -1,
          date: -1,
          media: -1,
        },
        timelineGroups,
      }
    }
    case 'nextImage': {
      const { activeIndex, timelineGroups } = state

      if (
        activeIndex.album === -1 &&
        activeIndex.date === -1 &&
        activeIndex.media === -1
      ) {
        return state
      }

      const albumGroups = timelineGroups[activeIndex.date].albums
      const albumMedia = albumGroups[activeIndex.album].media

      if (activeIndex.media < albumMedia.length - 1) {
        return {
          ...state,
          activeIndex: {
            ...state.activeIndex,
            media: activeIndex.media + 1,
          },
        }
      }

      if (activeIndex.album < albumGroups.length - 1) {
        return {
          ...state,
          activeIndex: {
            ...state.activeIndex,
            album: activeIndex.album + 1,
            media: 0,
          },
        }
      }

      if (activeIndex.date < timelineGroups.length - 1) {
        return {
          ...state,
          activeIndex: {
            date: activeIndex.date + 1,
            album: 0,
            media: 0,
          },
        }
      }

      // reached the end
      return state
    }
    case 'previousImage': {
      const { activeIndex } = state

      if (
        activeIndex.album === -1 &&
        activeIndex.date === -1 &&
        activeIndex.media === -1
      ) {
        return state
      }

      if (activeIndex.media > 0) {
        return {
          ...state,
          activeIndex: {
            ...activeIndex,
            media: activeIndex.media - 1,
          },
        }
      }

      if (activeIndex.album > 0) {
        const albumGroups = state.timelineGroups[activeIndex.date].albums
        const albumMedia = albumGroups[activeIndex.album - 1].media

        return {
          ...state,
          activeIndex: {
            ...activeIndex,
            album: activeIndex.album - 1,
            media: albumMedia.length - 1,
          },
        }
      }

      if (activeIndex.date > 0) {
        const albumGroups = state.timelineGroups[activeIndex.date - 1].albums
        const albumMedia = albumGroups?.at(-1)?.media

        return {
          ...state,
          activeIndex: {
            date: activeIndex.date - 1,
            album: albumGroups?.length ? albumGroups.length - 1 : 0,
            media: albumMedia?.length ? albumMedia.length - 1 : 0,
          },
        }
      }

      // reached the start
      return state
    }
    case 'selectImage': {
      return {
        ...state,
        activeIndex: action.index,
      }
    }
    case 'openPresentMode':
      return {
        ...state,
        presenting: true,
        activeIndex: action.activeIndex,
      }
    case 'closePresentMode': {
      return {
        ...state,
        presenting: false,
      }
    }
  }
}

export const getTimelineImage = ({
  mediaState,
  index,
}: {
  mediaState: TimelineGalleryState
  index: TimelineMediaIndex
}): MyTimelineQuery['myTimeline'][0] => {
  const { date, album, media } = index
  return mediaState.timelineGroups[date].albums[album].media[media]
}

export const getActiveTimelineImage = ({
  mediaState,
}: {
  mediaState: TimelineGalleryState
}) => {
  if (
    Object.values(mediaState.activeIndex).reduce<boolean>(
      (acc, next) => next === -1 || acc,
      false
    )
  ) {
    return undefined
  }

  return getTimelineImage({ mediaState, index: mediaState.activeIndex })
}

function convertMediaToTimelineGroups(
  timelineMedia: MyTimelineQuery['myTimeline']
): TimelineGroup[] {
  const days = new Map<string, Map<string, TimelineGroupAlbum>>()

  for (const media of timelineMedia) {
    const day = DateTime.fromISO(media.date).startOf('day').toFormat("yyyy-MM-dd'T'HH:mm:ss")

    let albums = days.get(day)
    if (albums === undefined) {
      albums = new Map<string, TimelineGroupAlbum>()
      days.set(day, albums)
    }

    const album = albums.get(media.album.id)
    if (album === undefined) {
      albums.set(media.album.id, {
        id: media.album.id,
        title: media.album.title,
        media: [media],
      })
    } else {
      album.media.push(media)
    }
  }

  return Array.from(days.entries())
    .sort(([left], [right]) => {
      if (left > right) {
        return -1
      }

      if (left < right) {
        return 1
      }

      return 0
    })
    .map(([date, albums]) => ({
      date,
      albums: Array.from(albums.values()),
    }))
}

export const openTimelinePresentMode = ({
  dispatchMedia,
  activeIndex,
}: {
  dispatchMedia: Dispatch<TimelineGalleryAction>
  activeIndex: TimelineMediaIndex
}) => {
  dispatchMedia({
    type: 'openPresentMode',
    activeIndex,
  })

  history.pushState({ presenting: true, activeIndex: activeIndex }, '')
}
