import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../../SettingsContext'

export default function FooterInfo() {
  const { t } = useTranslation()
  const { game } = useContext(SettingsContext)

  return (
    <div>
      <span className="save">{t('info.settings')}</span>
      {game && (
        <span className="appName">
          AppName: &nbsp;
          <span style={{ userSelect: 'all' }}> {game.id}</span>
        </span>
      )}
    </div>
  )
}
