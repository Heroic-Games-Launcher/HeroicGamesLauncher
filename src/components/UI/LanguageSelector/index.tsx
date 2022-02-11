import React from 'react'

export enum FlagPosition {
  NONE = 'none',
  PREPEND = 'prepend',
  APPEND = 'append'
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
    bg: 'български',
    ca: 'Català',
    cs: 'Čeština',
    de: 'Deutsch',
    el: 'Greek',
    en: 'English',
    es: 'Español',
    et: 'Eesti keel',
    fa: 'فارسی',
    fi: 'Suomen kieli',
    fr: 'Français',
    gl: 'Galego',
    hu: 'Magyar',
    hr: 'Hrvatski',
    ja: '日本語',
    ko: '한국어',
    id: 'Bahasa Indonesia',
    it: 'Italiano',
    ml: 'മലയാളം',
    nl: 'Nederlands',
    pl: 'Polski',
    pt: 'Português',
    pt_BR: 'Português (Brasil)',
    ru: 'Русский',
    sv: 'Svenska',
    ta: 'தமிழ்',
    tr: 'Türkçe',
    zh_Hans: '简化字',
    zh_Hant: '漢語'
  }

  const languageFlags: { [key: string]: string } = {
    // Catalan isn't a sovereign state (yet). So it hasn't a flag in the unicode standard.
    bg: '🇧🇬',
    ca: '🇪🇸',
    cs: '🇨🇿',
    de: '🇩🇪',
    el: '🇬🇷',
    en: '🇬🇧',
    es: '🇪🇸',
    fa: '🇮🇷',
    fi: '🇫🇮',
    fr: '🇫🇷',
    gl: '🇪🇸',
    hu: '🇭🇺',
    hr: '🇭🇷',
    ja: '🇯🇵',
    ko: '🇰🇷',
    id: '🇮🇩',
    it: '🇮🇹',
    ml: '🇮🇳',
    nl: '🇳🇱',
    pl: '🇵🇱',
    pt: '🇵🇹',
    pt_BR: '🇧🇷',
    ru: '🇷🇺',
    sv: '🇸🇪',
    ta: '🇮🇳',
    tr: '🇹🇷',
    zh_Hans: '🇨🇳',
    zh_Hant: '🇨🇳'
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
      data-testid="languageSelector"
      onChange={(event) => handleLanguageChange(event.target.value)}
      className={className + ' is-drop-down'}
      value={currentLanguage}
    >
      {Object.keys(languageLabels).map((lang) => renderOption(lang))}
    </select>
  )
}
