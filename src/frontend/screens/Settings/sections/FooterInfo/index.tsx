import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../../SettingsContext'

export default function FooterInfo() {
  const { t } = useTranslation()
  const { game } = useContext(SettingsContext)

  const openConfigFile = () =>
    window.api.showConfigFileInFolder(game ?? undefined)

  return (
    <div>
      <span className="save">{t('info.settings')}</span>
      {game && (
        <span className="appName">
          AppName: &nbsp;
          <button
            type="button"
            className="appNameButton"
            title={t(
              'settings.open-game-settings-file-hint',
              'Click to open game settings file'
            )}
            onClick={openConfigFile}
          >
            {game.id}
          </button>
        </span>
      )}
    </div>
  )
}
