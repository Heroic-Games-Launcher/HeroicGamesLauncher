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
        afterInput={
          <InfoBox text={t('settings.advanced.details', 'Details')}>
            <span style={{ userSelect: 'text' }}>
              {t(
                'settings.steamgriddb.help.description',
                'Provide your own SteamGridDB API key to enable game cover search. You can get one at www.steamgriddb.com/profile/preferences/api'
              )}
            </span>
          </InfoBox>
        }
      />
    </div>
  )
}
