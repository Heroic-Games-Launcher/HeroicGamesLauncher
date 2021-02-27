import { useCallback, useState } from 'react'

type Toggle = {
  on: boolean
  toggle: () => void
  close: () => void
  setOn: React.Dispatch<React.SetStateAction<boolean>>
}

export function useToggle(state = false): Toggle {
  const [on, setOn] = useState(state)

  const close = () => setOn(false)
  const toggle = useCallback(() => {
    setOn((o) => !o)
  }, [setOn])

  return { on, toggle, close, setOn }
}
