import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../../SettingsContext'

export default function FooterInfo() {
  const { t } = useTranslation()
  const { isDefault, appName } = useContext(SettingsContext)

  return (
    <div>
      <span className="save">{t('info.settings')}</span>
      {!isDefault && (
        <span className="appName">
          AppName: &nbsp;
          <span style={{ userSelect: 'all' }}> {appName}</span>
        </span>
      )}
    </div>
  )
}
