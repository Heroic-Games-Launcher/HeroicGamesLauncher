import React, { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField } from 'frontend/components/UI'
import { useGameConfig } from 'frontend/hooks/config'
import ResetToDefaultButton from 'frontend/components/UI/ResetToDefaultButton'

const PreferedLanguage = () => {
  const { t } = useTranslation()
  const [
    languageCode,
    setLanguageCode,
    gameLanguageConfigFetched,
    isSetToDefault,
    resetToDefault
  ] = useGameConfig('gameLanguage')

  if (!gameLanguageConfigFetched) return <></>

  const handleLanguageCode = async (event: ChangeEvent<HTMLInputElement>) =>
    setLanguageCode(event.currentTarget.value)

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
      inlineElement={
        <ResetToDefaultButton
          isSetToDefault={isSetToDefault}
          resetToDefault={resetToDefault}
        />
      }
    />
  )
}

export default PreferedLanguage
