import { useLayoutEffect, useState, useRef } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDelay(wait: number, deps: any[] = []) {
  const [update, setUpdate] = useState(false)
  const _ = update // to avoid "update is declared but its value is never read" warning
  const done = useRef(false)

  useLayoutEffect(() => {
    const handle = setTimeout(() => {
      done.current = true
      setUpdate(x => !x)
    }, wait)

    return () => {
      done.current = false
      clearTimeout(handle)
    }
  }, deps)

  return done.current
}

export default useDelay
