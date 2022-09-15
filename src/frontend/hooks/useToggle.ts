import { useCallback, useState } from 'react'

type Toggle = {
  close: () => void
  on: boolean
  setOn: React.Dispatch<React.SetStateAction<boolean>>
  toggle: () => void
}

export function useToggle(state = false): Toggle {
  const [on, setOn] = useState(state)

  const close = () => setOn(false)
  const toggle = useCallback(() => {
    setOn((o) => !o)
  }, [setOn])

  return { close, on, setOn, toggle }
}
