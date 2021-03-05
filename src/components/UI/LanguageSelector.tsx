import React from 'react';

export enum FlagPosition {
  NONE = 'none',
  PREPEND = 'prepend',
  APPEND = 'append'
}

interface Props {
  className?: string;
  currentLanguage?: string;
  flagPossition?: FlagPosition;
  handleLanguageChange: (language: string) => void;
}

export default function LanguageSelector({ 
  handleLanguageChange, 
  currentLanguage = 'en', 
  className = 'settingSelect',
  flagPossition = FlagPosition.NONE,
 }: Props) {
   
  const languageLabels: {[key: string]: string} = {
    'en': 'English',
    'pt': 'Português',
    'de': 'Deutsch',
    'fr': 'Français',
    'ru': 'Русский',
    'pl': 'Polski',
    'tr': 'Türkçe',
    'nl': 'Nederlands',
    'es': 'Español',
    'hu': 'Magyar',
  }

  const languageFlags: {[key: string]: string} = {
    'en': '🇬🇧',
    'pt': '🇵🇹',
    'de': '🇩🇪',
    'fr': '🇫🇷',
    'ru': '🇷🇺',
    'pl': '🇵🇱',
    'tr': '🇹🇷',
    'nl': '🇳🇱',
    'es': '🇪🇸',
    'hu': '🇭🇺',
  }

  const renderOption = (lang: string)  => {
    const flag = languageFlags[lang];
    let label = languageLabels[lang];
    if ( flagPossition === FlagPosition.PREPEND ) label = `${flag} ${label}`;
    if ( flagPossition === FlagPosition.APPEND ) label = `${label} ${flag}`;

    return <option key={lang} value={lang}>{label}</option>
  }
  return (
    <select 
      onChange={(event) => handleLanguageChange(event.target.value)}
      className={className}
      value={currentLanguage}
    >
      {Object.keys(languageLabels).map(lang => renderOption(lang))}
    </select>
  )
}
