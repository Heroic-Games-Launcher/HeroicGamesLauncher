import React from 'react'
import { epicState } from './epic_state'
import { useRecoilState } from 'recoil'
import GlobalState from './GlobalState'

interface Props {
  children: JSX.Element
}

export function GlobalStateFunctional({ children }: Props) {
  const [epic, setEpic] = useRecoilState(epicState)

  const props = {
    epic,
    setEpic
  }

  return <GlobalState {...props}>{children}</GlobalState>
}
