import { useEffect, useState } from 'react'

export function useAwaited<T>(getter: () => Promise<T>): T | null
export function useAwaited<T>(getter: () => Promise<T>, defaultValue: T): T
export function useAwaited<T>(
  getter: () => Promise<T>,
  defaultValue: T | null = null
): T | null {
  const [value, setValue] = useState<T | null>(defaultValue)

  useEffect(() => {
    // This is `setValue` as long as the component requesting the value is mounted
    let setValueIfMounted = setValue
    getter().then(setValueIfMounted)
    return () => {
      // TODO: Send signal to BE to abort the promise
      setValueIfMounted = () => {
        // We want to do nothing with the value here, since the component
        // requesting it no longer exists
      }
    }
  }, [])

  return value
}
