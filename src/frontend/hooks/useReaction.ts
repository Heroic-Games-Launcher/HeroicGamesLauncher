import { useEffect } from 'react'
import { reaction } from 'mobx'
import { IReactionPublic } from 'mobx/src/internal'

export default function useReaction<T>(
  {
    observer,
    fn,
    options = {}
  }: {
    observer: (r: IReactionPublic) => T
    fn: (val: T) => void
    options?: { fireImmediately?: boolean }
  },
  deps = []
) {
  useEffect(() => observer && reaction<T, boolean>(observer, fn, options), deps)
}
