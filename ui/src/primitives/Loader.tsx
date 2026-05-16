import { CSSProperties } from 'react'

type LoaderProps = {
  active: boolean
  message?: string
  size?: 'small' | 'default'
  className?: string
  style?: CSSProperties
}

const Loader = ({ active, message, className, style, size = 'default' }: LoaderProps) => {
  const dim = size === 'small' ? 24 : 40
  if (!active) return null
  return (
    <div className={className} style={{ width: dim, height: dim, ...style }} aria-label={message ?? 'Loading...'}>
      {message ?? 'Loading...'}
    </div>
  )
}

export default Loader
