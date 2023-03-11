import './index.css'

import { useTranslation } from 'react-i18next'
import Info from '@mui/icons-material/Info'
import React from 'react'
import PopoverComponent from '../PopoverComponent'

interface Props {
  children: React.ReactElement | React.ReactNode | React.ReactNode[]
  text: string
}

export default function InfoBox({ children, text }: Props) {
  const { t } = useTranslation()

  /*
    keys to parse
      t('infobox.help', 'Help')
      t('infobox.requirements')
      t('infobox.warning', 'Warning')
    */

  return (
    <PopoverComponent
      item={
        <span className="helpLink">
          <Info />
          <span>{t(text)}</span>
        </span>
      }
    >
      <div className="poppedElement">{children}</div>
    </PopoverComponent>
  )
}
