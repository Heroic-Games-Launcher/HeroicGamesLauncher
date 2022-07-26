import './index.css'

import { useToggle } from 'frontend/hooks'
import { useTranslation } from 'react-i18next'
import Info from '@mui/icons-material/Info'
import React from 'react'

interface Props {
  children: React.ReactNode
  text: string
}

export default function InfoBox({ children, text }: Props) {
  const { on: isHidden, toggle: toggleIsHidden } = useToggle(true)
  const { t } = useTranslation()

  /*
    keys to parse
      t('infobox.help')
      t('infobox.requirements')
    */

  return (
    <>
      <a
        role={'tooltip'}
        href="#"
        className="helpLink"
        onClick={(e) => {
          e.preventDefault()
          toggleIsHidden()
        }}
        data-testid="infoboxSpan"
      >
        <Info className="material-icons" />
        <p>{t(text)}</p>
      </a>
      <div
        style={{ display: isHidden ? 'none' : 'block' }}
        className="infoBox"
        data-testid="infoboxDiv"
      >
        {children}
      </div>
    </>
  )
}
