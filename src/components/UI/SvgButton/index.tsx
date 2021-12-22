import './index.css'

import React from 'react'

interface Props {
  onClick: () => void
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
