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
    <>
      <button
        className={`HelpButton ${open ? 'open' : ''}`}
        popovertarget="help_content"
        onClick={() => toggleOpen()}
      >
        ?
      </button>
      <div
        className={`HelpContent ${open ? 'open' : ''}`}
        id="help_content"
        popover="manual"
      >
        {Object.keys(items).map((key) => (
          <details key={key}>
            <summary>{items[key]['title']}</summary>
            {items[key]['content']}
          </details>
        ))}
      </div>
    </>
  )
}
