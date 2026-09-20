import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'

export function useAwaited<T, Args extends unknown[]>(
  getter: (...args: Args) => Promise<T>,
  ...args: Args
): T | null {
  const [value, setValue] = useState<T | null>(null)
  const setValueIfMounted = useRef<Dispatch<SetStateAction<T | null>>>(setValue)

  useEffect(() => {
    void getter(...args).then((result) => setValueIfMounted.current(result))
    return () => {
      // TODO: Send signal to BE to abort the promise
      setValueIfMounted.current = () => {
        // We want to do nothing with the value here, since the component
        // requesting it no longer exists
      }
    }
    // `args` is generated dynamically, so its identity will always change between function calls
    // Adding it to the dependency array directly will thus cause an infinite re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getter, ...args])

  return value
}
