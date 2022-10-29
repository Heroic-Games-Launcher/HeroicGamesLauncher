import React, { ChangeEvent, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../../SettingsContext'

const PreferedLanguage = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [languageCode, setLanguageCode] = useSetting('language', '')

  const handleLanguageCode = (event: ChangeEvent<HTMLInputElement>) =>
    setLanguageCode(event.currentTarget.value)

  if (isDefault) {
    return <></>
  }

  const languageInfo = (
    <InfoBox text="infobox.help">
      {t(
        'help.game_language.fallback',
        "Leave blank to use Heroic's language."
      )}
      <br />
      {t(
        'help.game_language.in_game_config',
        'Not all games support this configuration, some have in-game language setting.'
      )}
      <br />
      {t(
        'help.game_language.valid_codes',
        'Valid language codes are game-dependant.'
      )}
    </InfoBox>
  )

  return (
    <TextInputField
      label={t(
        'setting.prefered_language',
        'Prefered Language (Language Code)'
      )}
      htmlId="prefered-language"
      placeholder={t(
        'placeholder.prefered_language',
        '2-char code (i.e.: "en" or "fr")'
      )}
      value={languageCode}
      onChange={handleLanguageCode}
      afterInput={languageInfo}
    />
  )
}

export default PreferedLanguage
