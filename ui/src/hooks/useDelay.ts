import { useLayoutEffect, useState, useRef } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDelay(wait: number, deps: any[] = []) {
  const triggerUpdate = useState(false)[1] //TODO: How to fix the "useState call is not destructured into value + setter pair" error?
  const done = useRef(false)

  useLayoutEffect(() => {
    const handle = setTimeout(() => {
      done.current = true
      triggerUpdate(x => !x)
    }, wait)

    return () => {
      done.current = false
      clearTimeout(handle)
    }
  }, deps)

  return done.current
}

export default useDelay
