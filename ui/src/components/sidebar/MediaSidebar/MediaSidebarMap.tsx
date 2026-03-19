import { useTranslation } from 'react-i18next'
import { isNil } from '../../../helpers/utils'
import useMapboxMap from '../../mapbox/MapboxMap'
import { SidebarSection, SidebarSectionTitle } from '../SidebarComponents'
import { SidebarMediaQueryQuery } from './__generated__/MediaSidebar'

type MediaSidebarMapProps = {
  coordinates: NonNullable<SidebarMediaQueryQuery['media']['exif']>['coordinates']
}

const MediaSidebarMap = ({ coordinates }: MediaSidebarMapProps) => {
  const { t } = useTranslation()

  const hasCoordinates = !isNil(coordinates)
  const latitude = hasCoordinates ? coordinates.latitude : 0
  const longitude = hasCoordinates ? coordinates.longitude : 0

  const { mapContainer, mapboxToken } = useMapboxMap({
    mapboxOptions: {
      interactive: false,
      zoom: 12,
      center: { lat: latitude, lng: longitude },
    },
    configureMapbox: (map, mapboxLibrary) => {
      if (!hasCoordinates) return
      map.addControl(
        new mapboxLibrary.NavigationControl({ showCompass: false })
      )

      const centerMarker = new mapboxLibrary.Marker({
        color: 'red',
        scale: 0.8,
      })
      centerMarker.setLngLat({
        lat: latitude,
        lng: longitude,
      })
      centerMarker.addTo(map)
    },
  })

  if (!hasCoordinates || isNil(mapboxToken)) {
    return null
  }

  return (
    <SidebarSection>
      <SidebarSectionTitle>
        {t('sidebar.location.title', 'Location')}
      </SidebarSectionTitle>
      <div className="w-full h-64">{mapContainer}</div>
    </SidebarSection>
  )
}

export default MediaSidebarMap
