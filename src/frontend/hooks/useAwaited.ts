import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'

/**
 * Asynchronously invokes `getter` with `args` and returns either its return
 * value, or `null` (if the response is not there yet)
 *
 * NOTE: Make sure that `getter` has a fixed identity (that it is not a
 *       dynamically computed function expression (`() => { ... }`)). Either
 *       pass in a direct reference (e.g. `window.api.foo` instead of
 *       `() => window.api.foo()`) or memoize it first
 *       (`useCallback(() => { ... })`).
 *       If `getter` is not fixed, using this hook will cause infinite
 *       re-renders (`getter` returning a value triggers a re-render, which
 *       changes `getter`'s identity, which means it's called again and returns
 *       a new value... repeat).
 * @param getter The async function to invoke (potentially with `args`)
 * @param args The arguments to pass to `getter`
 */
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
