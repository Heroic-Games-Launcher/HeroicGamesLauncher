import React from 'react'

import './index.css'
import { CHProps, ContextMenuChild } from '../Child/index'

interface Props {
    children: CHProps[]
    left: string
    top: string
}

export default function ContextMenuParent({ children, left, top }: Props) {
  return (
    <div
      className="ctx-menu-parent"
      style={{
        left: left,
        top: top
      }}
    >
      { children.map((ele: CHProps, index) => {
        return <ContextMenuChild key={index} title={ele.title} onClick={ele.onClick} />
      }) }
    </div>
  )
}
