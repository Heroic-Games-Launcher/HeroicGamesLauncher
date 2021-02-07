import React from 'react'
import { useTranslation } from 'react-i18next'
import { useToggle } from '../../hooks'

interface Props {
  children: React.ReactNode
}

export default function InfoBox({ children }: Props) {
  const { on: isHidden, toggle: toggleIsHidden } = useToggle(true)
  const { t } = useTranslation()

  return (
    <>
      <span className="helpLink" onClick={toggleIsHidden}>
        <p>{t('infobox.help')}</p>
        <i className="material-icons">info</i>
      </span>
      <div style={{ display: isHidden ? 'none' : 'block' }} className="infoBox">
        {children}
      </div>
    </>
  )
}
