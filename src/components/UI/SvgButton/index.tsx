import './index.css'

import React, { MouseEvent } from 'react'

interface Props {
  onClick: (e: MouseEvent) => void
  children: JSX.Element
  className?: string
  disabled?: boolean
  title?: string
}

export default function SvgButton({
  onClick,
  children,
  className = '',
  disabled = false,
  title = undefined
}: Props) {
  return (
    <button
      title={title}
      disabled={disabled}
      className={`svg-button ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
