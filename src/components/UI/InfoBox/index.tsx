import './index.css'

import { useToggle } from 'src/hooks'
import { useTranslation } from 'react-i18next'
import Info from '@material-ui/icons/Info'
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
      <span className="helpLink" onClick={toggleIsHidden} data-testid="infobox-span">
        <p>{t(text)}</p>
        <Info className="material-icons" />
      </span>
      <div style={{ display: isHidden ? 'none' : 'block' }} className="infoBox" data-testid="infobox-div">
        {children}
      </div>
    </>
  )
}
