import { useEffect, useState } from 'react'

export function useAwaited<T, Args extends unknown[]>(
  getter: (...args: Args) => Promise<T>,
  ...args: Args
): T | null {
  const [value, setValue] = useState<T | null>(null)

  useEffect(() => {
    // This is `setValue` as long as the component requesting the value is mounted
    let setValueIfMounted = setValue
    void getter(...args).then(setValueIfMounted)
    return () => {
      // TODO: Send signal to BE to abort the promise
      setValueIfMounted = () => {
        // We want to do nothing with the value here, since the component
        // requesting it no longer exists
      }
    }
  }, [getter, args])

  return value
}
