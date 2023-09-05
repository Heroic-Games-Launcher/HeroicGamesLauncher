import React, { useState } from 'react'

import './index.scss'
import { HelpItem } from 'frontend/types'

interface Props {
  items: { [key: string]: HelpItem }
}

export default function Help({ items }: Props) {
  const [open, setOpen] = useState(false)

  const toggleOpen = () => {
    setOpen(!open)
  }

  return (
    <div className={`Help ${open ? 'open' : ''}`}>
      <button onClick={() => toggleOpen()}>?</button>
      {Object.keys(items).map((key) => (
        <details key={key}>
          <summary>{items[key]['title']}</summary>
          {items[key]['content']}
        </details>
      ))}
    </div>
  )
}
