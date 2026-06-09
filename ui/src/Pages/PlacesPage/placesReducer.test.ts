import { placesReducer, PlacesState } from './placesReducer'
import { PresentMarker } from './PlacesPage'

describe('places reducer', () => {
    const defaultState: PlacesState = {
        presenting: false,
        activeIndex: 0,
        media: [],
    }

    const markerA: PresentMarker = { id: 1, cluster: false }

    describe('replacePresentMarker action', () => {
        test('sets presentMarker when no existing marker is present', () => {
            const result = placesReducer(defaultState, {
                type: 'replacePresentMarker',
                marker: markerA,
            })
            expect(result).toEqual({ ...defaultState, presentMarker: markerA })
        })

        test('sets presenting: true when dispatched marker matches existing marker (same id and cluster)', () => {
            const stateWithMarker: PlacesState = { ...defaultState, presentMarker: markerA }
            const result = placesReducer(stateWithMarker, {
                type: 'replacePresentMarker',
                marker: markerA,
            })
            expect(result).toEqual({ ...stateWithMarker, presenting: true })
        })

        test('replaces presentMarker when incoming id differs from existing marker id', () => {
            const stateWithMarker: PlacesState = { ...defaultState, presentMarker: markerA }
            const newMarker: PresentMarker = { id: 2, cluster: false }
            const result = placesReducer(stateWithMarker, {
                type: 'replacePresentMarker',
                marker: newMarker,
            })
            expect(result).toEqual({ ...stateWithMarker, presentMarker: newMarker })
        })

        test('replaces presentMarker when incoming cluster differs from existing marker cluster', () => {
            const stateWithMarker: PlacesState = { ...defaultState, presentMarker: markerA }
            const newMarker: PresentMarker = { id: 1, cluster: true }
            const result = placesReducer(stateWithMarker, {
                type: 'replacePresentMarker',
                marker: newMarker,
            })
            expect(result).toEqual({ ...stateWithMarker, presentMarker: newMarker })
        })

        test('clears presentMarker when action.marker is undefined', () => {
            const stateWithMarker: PlacesState = { ...defaultState, presentMarker: markerA }
            const result = placesReducer(stateWithMarker, {
                type: 'replacePresentMarker',
                marker: undefined,
            })
            expect(result).toEqual({ ...stateWithMarker, presentMarker: undefined })
        })

        test('supports string marker ids: sets presenting: true on matching string id marker', () => {
            const markerWithStringId: PresentMarker = { id: 'cluster-42', cluster: true }
            const stateWithMarker: PlacesState = { ...defaultState, presentMarker: markerWithStringId }
            const result = placesReducer(stateWithMarker, {
                type: 'replacePresentMarker',
                marker: markerWithStringId,
            })
            expect(result).toEqual({ ...stateWithMarker, presenting: true })
        })

        test('preserves all other state fields when updating presentMarker', () => {
            const richState: PlacesState = {
                presenting: false,
                activeIndex: 3,
                media: [],
                presentMarker: undefined,
            }
            const result = placesReducer(richState, {
                type: 'replacePresentMarker',
                marker: markerA,
            })
            expect(result).toEqual({ ...richState, presentMarker: markerA })
        })
    })

    describe('delegated actions (mediaGalleryReducer)', () => {
        test('delegates openPresentMode to mediaGalleryReducer', () => {
            const result = placesReducer(defaultState, {
                type: 'openPresentMode',
                activeIndex: 2,
            })
            expect(result).toEqual({ ...defaultState, presenting: true, activeIndex: 2 })
        })

        test('delegates closePresentMode to mediaGalleryReducer', () => {
            const openState: PlacesState = { ...defaultState, presenting: true, activeIndex: 1 }
            const result = placesReducer(openState, { type: 'closePresentMode' })
            expect(result).toEqual({ ...openState, presenting: false })
        })

        test('delegates replaceMedia to mediaGalleryReducer', () => {
            const result = placesReducer(
                { ...defaultState, activeIndex: 3, presenting: true },
                { type: 'replaceMedia', media: [] }
            )
            expect(result).toEqual({ ...defaultState, activeIndex: -1, presenting: false, media: [] })
        })
    })
})
