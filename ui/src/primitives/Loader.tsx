import { CSSProperties } from 'react'

type LoaderProps = {
  active: boolean
  message?: string
  //TODO: carefully analyze the codebase to figure out how to consistently and reliably handle the "'size' PropType is defined but prop is never used" warning. Why is it unused? Is it forgotten to be called, or unneeded? Is it handled indirectly, so the static cannot detect it?
  size?: 'small' | 'default'
  className?: string
  style?: CSSProperties
}

const Loader = ({ active, message, className, style }: LoaderProps) => {
  if (!active) return null
  return (
    <div className={className} style={style}>
      {message ?? 'Loading...'}
    </div>
  )
}

export default Loader
