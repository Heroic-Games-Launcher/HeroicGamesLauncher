import './index.css'

import React, { MouseEvent } from 'react'

interface Props {
  onClick: (e: MouseEvent) => void
  children: JSX.Element
  className?: string
}

export default function SvgButton({
  onClick,
  children,
  className = ''
}: Props) {
  return (
    <button className={`svg-button ${className}`} onClick={onClick}>
      {children}
    </button>
  )
}
