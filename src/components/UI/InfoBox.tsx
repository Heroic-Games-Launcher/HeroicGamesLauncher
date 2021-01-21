import React from 'react'
import { useToggle } from '../../hooks'

interface Props {
  children: React.ReactNode
}

export default function InfoBox({ children }: Props) {
  const { on: isHidden, toggle: toggleIsHidden } = useToggle(true)
  return (
    <>
      <span className="helpLink" onClick={toggleIsHidden}>
        <p>Help</p>
        <i className="material-icons">info</i>
      </span>
      <div style={{ display: isHidden ? 'none' : 'block' }} className="infoBox">
        {children}
      </div>
    </>
  )
}
