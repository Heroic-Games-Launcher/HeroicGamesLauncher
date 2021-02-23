import React from 'react';

interface Props {
  className?: string;
  currentLanguage?: string;
  handleLanguageChange: (language: string) => void;
}

export default function LanguageSelector({ handleLanguageChange, currentLanguage = 'en', className = 'settingSelect' }: Props) {
  const languages: {[key:string]: string} = {
    'en': 'English 🇬🇧',
    'pt': 'Português 🇧🇷',
    'de': 'Deutsch 🇩🇪',
    'fr': 'Français 🇫🇷',
    'ru': 'Русский 🇷🇺',
    'pl': 'Polski 🇵🇱',
    'tr': 'Türkçe 🇹🇷',
    'nl': 'Nederlands 🇳🇱',
  }
  const renderOption = (lang: string)  => {
    const label = languages[lang];
    return <option key={lang} value={lang}>{label}</option>
  }
  return (
    <select 
      onChange={(event) => handleLanguageChange(event.target.value)}
      className={className}
      value={currentLanguage}
    >
      {Object.keys(languages).map(lang => renderOption(lang))}
    </select>
  )
}