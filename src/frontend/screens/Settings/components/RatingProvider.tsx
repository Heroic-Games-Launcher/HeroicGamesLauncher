import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField, TextInputField } from 'frontend/components/UI'
import { MenuItem } from '@mui/material'
import useSetting from 'frontend/hooks/useSetting'

export default function RatingProviderSetting() {
  const { t } = useTranslation()
  const [provider, setProvider] = useSetting('ratingProvider', 'none')
  const [apiKey, setApiKeyInput] = useState('')
  const [apiKeyChanged, setApiKeyChanged] = useState(false)

  function commitApiKey() {
    if (!apiKeyChanged) return
    setApiKeyChanged(false)
    void window.api.ratings.setApiKey(apiKey)
  }

  return (
    <>
      <SelectField
        htmlId="ratings-provider"
        value={provider}
        onChange={(event) => setProvider(event.target.value as 'none' | 'rawg')}
        label={t('settings.ratings.provider.title', 'Ratings Provider')}
      >
        <MenuItem value="none">
          {t('settings.ratings.provider.none', 'None')}
        </MenuItem>
        <MenuItem value="rawg">
          {t(
            'settings.ratings.provider.rawg_metacritic',
            'RAWG (Metacritic Score)'
          )}
        </MenuItem>
      </SelectField>

      {provider === 'rawg' && (
        <TextInputField
          label={t('settings.ratings.apikey.title', 'RAWG API Key')}
          placeholder={t(
            'settings.ratings.apikey.placeholder',
            'Enter your RAWG API key'
          )}
          onChange={(value) => {
            setApiKeyInput(value)
            setApiKeyChanged(true)
          }}
          value={apiKey}
          onBlur={commitApiKey}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          htmlId="ratings-rawg-api-key"
          type="password"
        />
      )}
    </>
  )
}
