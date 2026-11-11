import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import gamepage from '../public/locales/en/gamepage.json'
import login from '../public/locales/en/login.json'
import translation from '../public/locales/en/translation.json'

const i18n = createInstance()

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  returnNull: false,
  returnEmptyString: false,
  defaultNS: 'translation',
  ns: ['translation', 'gamepage', 'login'],
  resources: { en: { translation, gamepage, login } },
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
})

export default i18n
