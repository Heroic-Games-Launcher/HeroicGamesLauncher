import React from 'react'
import { useTranslation } from 'react-i18next'
import Info from '@material-ui/icons/Info'
import { useToggle } from '../../hooks'

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
      <span className="helpLink" onClick={toggleIsHidden}>
        <p>{t(text)}</p>
        <Info className="material-icons" />
      </span>
      <div style={{ display: isHidden ? 'none' : 'block' }} className="infoBox">
        {children}
      </div>
    </>
  )
}
