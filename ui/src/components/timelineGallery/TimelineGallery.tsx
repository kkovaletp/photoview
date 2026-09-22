import { useEffect, useReducer } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import TimelineGroupDate from './TimelineGroupDate'
import PresentView from '../photoGallery/presentView/PresentView'
import useURLParameters from '../../hooks/useURLParameters'
import useScrollPagination from '../../hooks/useScrollPagination'
import PaginateLoader from '../PaginateLoader'
import { useTranslation } from 'react-i18next'
import {
  MyTimelineQuery,
  MyTimelineQueryVariables,
} from './__generated__/TimelineGallery'
import {
  getActiveTimelineImage as getActiveTimelineMedia,
  timelineGalleryReducer,
  TimelineMediaIndex,
} from './timelineGalleryReducer'
import { useUrlPresentModeSetup } from '../photoGallery/mediaGalleryReducer'
import TimelineFilters from './TimelineFilters'

export const MY_TIMELINE_QUERY = gql`
  query myTimeline(
    $onlyFavorites: Boolean
    $limit: Int
    $offset: Int
    $fromDate: Time
  ) {
    myTimeline(
      onlyFavorites: $onlyFavorites
      fromDate: $fromDate
      paginate: { limit: $limit, offset: $offset }
    ) {
      id
      title
      type
      blurhash
      thumbnail {
        url
        width
        height
      }
      highRes {
        url
        width
        height
      }
      videoWeb {
        url
      }
      favorite
      album {
        id
        title
      }
      date
    }
  }
`

export type TimelineGroup = {
  date: string
  albums: TimelineGroupAlbum[]
}

export type TimelineGroupAlbum = {
  id: string
  title: string
  media: MyTimelineQuery['myTimeline']
}

const TimelineGallery = () => {
  const { t } = useTranslation()

  const { getParam, setParam } = useURLParameters()

  const onlyFavorites = getParam('favorites') === '1'
  const setOnlyFavorites = (favorites: boolean) =>
    setParam('favorites', favorites ? '1' : null)

  const filterDate = getParam('date')
  const setFilterDate = (x: string) => setParam('date', x)

  const [mediaState, dispatchMedia] = useReducer(timelineGalleryReducer, {
    presenting: false,
    timelineGroups: [],
    activeIndex: {
      date: -1,
      album: -1,
      media: -1,
    },
  })

  const { data, error, loading, fetchMore } = useQuery<
    MyTimelineQuery,
    MyTimelineQueryVariables
  >(MY_TIMELINE_QUERY, {
    variables: {
      onlyFavorites,
      fromDate: filterDate
        ? `${Number.parseInt(filterDate) + 1}-01-01T00:00:00Z`
        : undefined,
      offset: 0,
      limit: 200,
    },
  })

  //TODO: How to fix the following type mismatch:
  /*
Type 'FetchMoreFunction<MyTimelineQuery, Exact<{ onlyFavorites?: boolean | null | undefined; limit?: number | null | undefined; offset?: number | null | undefined; fromDate?: string | null | undefined; }>>' is not assignable to type '(args: { variables: { offset: number; }; }) => Promise<Result<MyTimelineQuery, "complete" | "empty" | "partial" | "streaming">>'.
  Type 'Promise<{ data: MyTimelineQuery; error?: undefined; }>' is not assignable to type 'Promise<Result<MyTimelineQuery, "complete" | "empty" | "partial" | "streaming">>'.
    Type '{ data: MyTimelineQuery; error?: undefined; }' is not assignable to type 'Result<MyTimelineQuery, "complete" | "empty" | "partial" | "streaming">'.
      Type '{ data: MyTimelineQuery; error?: undefined; }' is not assignable to type '({ error?: ErrorLike | undefined; loading: boolean; networkStatus: NetworkStatus; partial: boolean; } & { data: MyTimelineQuery; dataState: "complete"; }) | ({ ...; } & { ...; }) | ({ ...; } & { ...; })'.
        Type '{ data: MyTimelineQuery; error?: undefined; }' is not assignable to type '{ error?: ErrorLike | undefined; loading: boolean; networkStatus: NetworkStatus; partial: boolean; } & { data: DeepPartialObject<MyTimelineQuery>; dataState: "partial"; }'.
          Type '{ data: MyTimelineQuery; error?: undefined; }' is missing the following properties from type '{ error?: ErrorLike | undefined; loading: boolean; networkStatus: NetworkStatus; partial: boolean; }': loading, networkStatus, partial
useScrollPagination.ts(7, 3): The expected type comes from property 'fetchMore' which is declared here on type 'ScrollPaginationArgs<MyTimelineQuery>'
  */
  const { containerElem, loadingMore } =
    useScrollPagination<MyTimelineQuery>({
      loading,
      fetchMore,
      data,
      getItems: data => data.myTimeline,
      pageSize: 200,
    })

  useEffect(() => {
    dispatchMedia({
      type: 'replaceTimelineGroups',
      timeline: data?.myTimeline || [],
    })
  }, [data])

  useUrlPresentModeSetup({
    dispatchMedia,
    openPresentMode: (_event) => {
      dispatchMedia({
        type: 'openPresentMode',
        activeIndex: mediaState.activeIndex as unknown as TimelineMediaIndex,
      })
    },
  })

  if (error) {
    return <div>{error.message}</div>
  }

  const timelineGroups = mediaState.timelineGroups.map((group, i) => (
    <TimelineGroupDate
      key={`${group.date}-${i}`}
      groupIndex={i}
      mediaState={mediaState}
      dispatchMedia={dispatchMedia}
    />
  ))

  return (
    <div className="overflow-x-hidden">
      <TimelineFilters
        onlyFavorites={onlyFavorites}
        setOnlyFavorites={setOnlyFavorites}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
      />
      <div className="-mx-3 flex flex-wrap" ref={containerElem}>
        {timelineGroups}
      </div>
      <PaginateLoader
        active={loadingMore}
        text={t('general.loading.paginate.media', 'Loading more media')}
      />
      {mediaState.presenting && (
        <PresentView
          data-testid="present-view"
          activeMedia={getActiveTimelineMedia({ mediaState })!}
          dispatchMedia={dispatchMedia}
        />
      )}
    </div>
  )
}

export default TimelineGallery
