import React from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  appName: string
}

export default function FooterInfo({ appName }: Props) {
  const { t } = useTranslation()
  const isDefault = appName === 'default'

  return (
    <div>
      <span className="save">{t('info.settings')}</span>
      {!isDefault && <span className="appName">AppName: {appName}</span>}
    </div>
  )
}
