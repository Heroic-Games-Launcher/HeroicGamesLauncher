import React from 'react'

import './index.css'

export interface CHProps {
    title: string
    onClick: () => void
}

export function ContextMenuChild({ title, onClick }: CHProps) {
  return (
    <div
      className="ctx-menu-child"
      onClick={onClick}>
      { title }
    </div>
  )
}
