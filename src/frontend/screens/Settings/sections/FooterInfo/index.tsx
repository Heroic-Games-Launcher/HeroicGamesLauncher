import { useContext } from 'react'
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
          <span
            style={{ userSelect: 'all' }}
            title={t(
              'settings.open-game-settings-file-hint',
              'Click to open game settings file'
            )}
            onClick={() => window.api.showConfigFileInFolder(appName)}
          >
            {appName}
          </span>
        </span>
      )}
    </div>
  )
}
