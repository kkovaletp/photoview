import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProtectedImage } from '../photoGallery/ProtectedMedia'
import { AlbumQueryQuery } from '../../Pages/AlbumPage/__generated__/AlbumPage'

interface AlbumBoxImageProps {
  src?: string
}

const AlbumBoxImage = ({ src, ...props }: AlbumBoxImageProps) => {
  const [loaded, setLoaded] = useState(false)

  let image = null
  if (src) {
    image = (
      <ProtectedImage
        className="object-cover object-center w-full h-full rounded-lg"
        {...props}
        onLoad={() => setLoaded(true)}
        src={src}
      />
    )
  }

  let placeholder = null
  if (!loaded) {
    placeholder = (
      <div className="bg-gray-100 dark:bg-[#191c1f] animate-pulse w-full h-full rounded-lg absolute top-0"></div>
    )
  }

  return (
    <div className="xs:w-55 xs:h-55 relative rounded-lg">
      {image}
      {placeholder}
    </div>
  )
}

type AlbumBoxProps = {
  album?: AlbumQueryQuery['album']['subAlbums'][0]
  customLink?: string
}

export const AlbumBox = ({ album, customLink, ...props }: AlbumBoxProps) => {
  const wrapperClasses =
    'inline-block text-center text-gray-900 dark:text-gray-200 mx-3 my-2 xs:h-60 xs:w-[220px]'

  if (album) {
    return (
      <Link
        to={customLink || `/album/${album.id}`}
        className={wrapperClasses}
        {...props}
      >
        <AlbumBoxImage src={album.thumbnail?.thumbnail?.url} />
        <p className="whitespace-nowrap overflow-hidden text-ellipsis">
          {album.title}
        </p>
      </Link>
    )
  }

  return (
    <div className={wrapperClasses} {...props}>
      <AlbumBoxImage />
    </div>
  )
}
