let i18n_language = 'en'

export function useTranslation() {
  return {
    i18n : {
      changeLanguage: (lang: string) => i18n_language = lang,
      language: i18n_language
    },
    t: (str: string) => str
  };
}
