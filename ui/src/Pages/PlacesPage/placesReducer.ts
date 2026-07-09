import { PresentMarker } from './PlacesPage'
import {
  MediaGalleryState,
  PhotoGalleryAction,
  mediaGalleryReducer,
} from '../../components/photoGallery/mediaGalleryReducer'

export interface PlacesState extends MediaGalleryState {
  presentMarker?: PresentMarker
}

export type PlacesAction =
  | PhotoGalleryAction
  | { type: 'replacePresentMarker'; marker?: PresentMarker }

export function placesReducer(
  state: PlacesState,
  action: PlacesAction
): PlacesState {
  if (action.type === 'replacePresentMarker') {
    if (
      // Don't use the optional chaining operator here since we want to avoid the `undefined` === `undefined` case
      // to set the `presenting: true`.
      state.presentMarker != null &&
      action.marker != null &&
      state.presentMarker.cluster === action.marker.cluster &&
      state.presentMarker.id === action.marker.id
    ) {
      return {
        ...state,
        presenting: true,
      }
    } else {
      return {
        ...state,
        presentMarker: action.marker,
      }
    }
  } else {
    return mediaGalleryReducer(state, action)
  }
}
