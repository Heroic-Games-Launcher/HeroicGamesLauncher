import './index.css'

import { useToggle } from 'src/hooks'
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
        href="#"
        className="helpLink"
        onClick={(e) => {
          e.preventDefault()
          toggleIsHidden()
        }}
        data-testid="infoboxSpan"
      >
        <p>{t(text)}</p>
        <Info className="material-icons" />
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
