import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { configStore } from 'frontend/helpers/electronStores'
import ContextProvider from 'frontend/state/ContextProvider'
import { SelectField } from '..'

const storage: Storage = window.localStorage

export enum FlagPosition {
  NONE = 'none',
  PREPEND = 'prepend',
  APPEND = 'append'
}

interface Props {
  flagPossition?: FlagPosition
  showWeblateLink?: boolean
}

const languageLabels: { [key: string]: string } = {
  ar: 'العربية',
  az: 'آذربایجان دیلی',
  be: 'беларуская мова',
  bg: 'български',
  bs: 'босански',
  ca: 'Català',
  cs: 'Čeština',
  de: 'Deutsch',
  el: 'Greek',
  en: 'English',
  es: 'Español',
  et: 'Eesti keel',
  eu: 'Euskara',
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
  nb_NO: 'bokmål',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  pt_BR: 'Português (Brasil)',
  ro: 'limba română',
  ru: 'Русский',
  sk: 'slovenčina',
  sv: 'Svenska',
  ta: 'தமிழ்',
  tr: 'Türkçe',
  uk: 'украї́нська мо́ва',
  vi: 'tiếng Việt',
  zh_Hans: '简化字',
  zh_Hant: '漢語'
}

const languageFlags: { [key: string]: string } = {
  ar: '🇸🇦',
  az: '🇦🇿',
  be: '🇧🇾',
  bg: '🇧🇬',
  bs: '🇧🇦',
  ca: '🇪🇸',
  cs: '🇨🇿',
  de: '🇩🇪',
  el: '🇬🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  et: '🇪🇪',
  eu: '🇪🇸',
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
  nb_NO: '🇳🇴',
  nl: '🇳🇱',
  pl: '🇵🇱',
  pt: '🇵🇹',
  pt_BR: '🇧🇷',
  ro: '🇷🇴',
  ru: '🇷🇺',
  sk: '🇸🇰',
  sv: '🇸🇪',
  ta: '🇮🇳',
  tr: '🇹🇷',
  uk: '🇺🇦',
  vi: '🇻🇳',
  zh_Hans: '🇨🇳',
  zh_Hant: '🇨🇳'
}

export default function LanguageSelector({
  flagPossition = FlagPosition.NONE,
  showWeblateLink = false
}: Props) {
  const { t, i18n } = useTranslation()
  const { language, setLanguage } = useContext(ContextProvider)
  const currentLanguage = language || i18n.language || 'en'

  const handleChangeLanguage = (newLanguage: string) => {
    window.api.changeLanguage(newLanguage)
    storage.setItem('language', newLanguage)
    configStore.set('language', newLanguage)
    i18n.changeLanguage(newLanguage)
    setLanguage(newLanguage)
  }

  function handleWeblate() {
    return window.api.openWeblate()
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

  let afterSelect = null
  if (showWeblateLink) {
    afterSelect = (
      <a
        data-testid="buttonWeblate"
        onClick={handleWeblate}
        className="smallLink"
      >
        {t('other.weblate', 'Help Improve this translation.')}
      </a>
    )
  }

  return (
    <>
      <SelectField
        htmlId="languageSelector"
        onChange={(event) => handleChangeLanguage(event.target.value)}
        value={currentLanguage}
        label={t('setting.language', 'Choose App Language')}
        extraClass="languageSelector"
        afterSelect={afterSelect}
      >
        {Object.keys(languageLabels).map((lang) => renderOption(lang))}
      </SelectField>
    </>
  )
}
