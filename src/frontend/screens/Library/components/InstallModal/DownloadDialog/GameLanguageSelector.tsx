import { InstallPlatform } from 'common/types'
import { SelectField } from 'frontend/components/UI'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '@mui/material'

interface GameLanguageSelectorProps {
  installLanguages: string[]
  installLanguage: string
  installPlatform: InstallPlatform
  setInstallLanguage: (value: string) => void
  // Display locale per value
  languageLocales?: Record<string, string>
}

export default function GameLanguageSelector({
  installLanguages,
  installLanguage,
  setInstallLanguage,
  installPlatform,
  languageLocales
}: GameLanguageSelectorProps) {
  const { t, i18n } = useTranslation('gamepage')
  const getLanguageName = useMemo(() => {
    return (language: string) => {
      try {
        const locale = (languageLocales?.[language] ?? language).replace(
          '_',
          '-'
        )
        const displayNames = new Intl.DisplayNames(
          [locale, ...i18n.languages, 'en'],
          {
            type: 'language',
            style: 'long'
          }
        )
        return displayNames.of(locale)
      } catch {
        return language
      }
    }
  }, [i18n.languages, installPlatform, languageLocales])

  return (
    <SelectField
      label={`${t('game.language', 'Language')}:`}
      htmlId="languagePick"
      value={installLanguage}
      disabled={installLanguages?.length === 1}
      onChange={(e) => setInstallLanguage(e.target.value)}
    >
      {installLanguages &&
        installLanguages.map((value) => (
          <MenuItem value={value} key={value}>
            {getLanguageName(value)}
          </MenuItem>
        ))}
    </SelectField>
  )
}
