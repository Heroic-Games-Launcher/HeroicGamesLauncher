import React from 'react'

export enum FlagPosition {
  NONE = 'none',
  PREPEND = 'prepend',
  APPEND = 'append',
}

interface Props {
  className?: string
  currentLanguage?: string
  flagPossition?: FlagPosition
  handleLanguageChange: (language: string) => void
}

export default function LanguageSelector({
  handleLanguageChange,
  currentLanguage = 'en',
  className = 'settingSelect',
  flagPossition = FlagPosition.NONE
}: Props) {
  const languageLabels: { [key: string]: string } = {
    de: 'Deutsch',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    hu: 'Magyar',
    ml: 'മലയാളം',
    nl: 'Nederlands',
    pl: 'Polski',
    pt: 'Português',
    ru: 'Русский',
    tr: 'Türkçe'
  }

  const languageFlags: { [key: string]: string } = {
    de: '🇩🇪',
    en: '🇬🇧',
    es: '🇪🇸',
    fr: '🇫🇷',
    hu: '🇭🇺',
    ml: '🇮🇳',
    nl: '🇳🇱',
    pl: '🇵🇱',
    pt: '🇵🇹',
    ru: '🇷🇺',
    tr: '🇹🇷'
  }

  const renderOption = (lang: string) => {
    const flag = languageFlags[lang]
    let label = languageLabels[lang]
    if (flagPossition === FlagPosition.PREPEND) label = `${flag} ${label}`
    if (flagPossition === FlagPosition.APPEND) label = `${label} ${flag}`

    return (
      <option key={lang} value={lang}>
        {label}
      </option>
    )
  }
  return (
    <select
      onChange={(event) => handleLanguageChange(event.target.value)}
      className={className}
      value={currentLanguage}
    >
      {Object.keys(languageLabels).map((lang) => renderOption(lang))}
    </select>
  )
}
