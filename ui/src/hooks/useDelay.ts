import { useLayoutEffect, useState } from 'react'

function useDelay(wait: number, resetKey?: unknown): boolean {
  const [done, setDone] = useState(false)

  useLayoutEffect(() => {
    setDone(false)

    const handle = setTimeout(() => {
      setDone(true)
    }, wait)

    return () => {
      clearTimeout(handle)
    }
  }, [wait, resetKey])

  return done
}

export default useDelay
