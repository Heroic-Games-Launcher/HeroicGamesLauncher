import { useMemo, useState } from 'react'
import useReaction from './useReaction'
import { debounce } from 'lodash'

export default function useComputedValue<T>(
  fn: () => T,
  { debounceTime }: { debounceTime?: number } = {}
) {
  const [state, setState] = useState<T>(fn)

  useReaction({
    observer: fn,
    fn: useMemo(() => (debounceTime ? debounce(setState, 300) : setState), []),
    options: {
      fireImmediately: true
    }
  })

  return state
}
