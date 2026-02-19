import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'

export default function SteamGridDbApiKey() {
  const { t } = useTranslation()
  const { config, setSetting } = useContext(SettingsContext)

  return (
    <div className="AdvancedSetting">
      <TextInputField
        label={t('settings.steamgriddb.apikey.title', 'SteamGridDB API Key')}
        placeholder={t(
          'settings.steamgriddb.apikey.placeholder',
          'Enter your SteamGridDB API Key here'
        )}
        onChange={(newValue) => setSetting('steamGridDbApiKey', newValue)}
        value={config.steamGridDbApiKey || ''}
        htmlId="steamgriddb-api-key"
      />

      <InfoBox text={t('settings.advanced.details', 'Details')}>
        {t(
          'settings.steamgriddb.apikey.description',
          'Provide your own SteamGridDB API key to enable cover search. You can get one at www.steamgriddb.com/profile/preferences/api'
        )}
      </InfoBox>
    </div>
  )
}
