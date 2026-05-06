import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField } from 'frontend/components/UI'

export default function SteamGridDbApiKey() {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    void window.api.steamgriddb.hasApiKey().then(setHasKey)
  }, [])

  const onChange = (newValue: string) => {
    setValue(newValue)
    void window.api.steamgriddb.setApiKey(newValue).then(() => {
      setHasKey(!!newValue)
    })
  }

  const placeholder = hasKey
    ? t(
        'settings.steamgriddb.apikey.placeholder_saved',
        'Key saved — type to replace, clear to remove'
      )
    : t(
        'settings.steamgriddb.apikey.placeholder',
        'Enter your SteamGridDB API Key here'
      )

  return (
    <TextInputField
      label={t('settings.steamgriddb.apikey.title', 'SteamGridDB API Key')}
      placeholder={placeholder}
      onChange={onChange}
      value={value}
      htmlId="steamgriddb-api-key"
      type="password"
      afterInput={
        <InfoBox text={t('settings.advanced.details', 'Details')}>
          <span style={{ userSelect: 'text' }}>
            {t(
              'settings.steamgriddb.help.description',
              'Provide your own SteamGridDB API key to enable game cover search. The key is stored encrypted when your system supports it. You can get one at www.steamgriddb.com/profile/preferences/api'
            )}
          </span>
        </InfoBox>
      }
    />
  )
}
