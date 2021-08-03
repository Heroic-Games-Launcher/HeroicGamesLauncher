import React from 'react'

import './index.css'

interface Props {
    children?: React.ReactNode
    isVisible: boolean
    left: string
    top: string
}

export default function ContextMenuParent({ children, left, top, isVisible }: Props) {
  return (
    <div
      className="ctx-menu-parent"
      style={{
        left: left,
        top: top,
        display: isVisible ? 'block': 'none'
      }}
    >
      { children }
    </div>
  )
}
