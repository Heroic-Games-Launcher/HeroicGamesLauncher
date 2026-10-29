import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../../SettingsContext'
import './index.css'

export default function FooterInfo() {
  const { t } = useTranslation()
  const { isDefault, appName } = useContext(SettingsContext)

  const openConfigFile = () => window.api.showConfigFileInFolder(appName)

  return (
    <div className="settingsFooter">
      <span className="settingsFooter__hint">{t('info.settings')}</span>
      {!isDefault && (
        <span className="settingsFooter__appName">
          AppName:&nbsp;
          <button
            type="button"
            className="appNameButton"
            title={t(
              'settings.open-game-settings-file-hint',
              'Click to open game settings file'
            )}
            onClick={openConfigFile}
          >
            {appName}
          </button>
        </span>
      )}
    </div>
  )
}
