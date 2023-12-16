import React, { useState } from 'react'

import './index.scss'
import { HelpItem } from 'frontend/types'
import { useTranslation } from 'react-i18next'

interface Props {
  items: { [key: string]: HelpItem }
}

export default function Help({ items }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const toggleOpen = () => {
    setOpen(!open)
  }

  return (
    <>
      <button
        className={`HelpButton ${open ? 'open' : ''}`}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore, this feature is new and not yet typed
        popovertarget="help_content"
        onClick={() => toggleOpen()}
        title={
          open
            ? t('help.button.close', 'Close Help')
            : t('help.button.open', 'Open Help')
        }
      >
        ?
      </button>
      <div
        className={`HelpContent ${open ? 'open' : ''}`}
        id="help_content"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore, this feature is new and not yet typed
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
