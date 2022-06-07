import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import tGamepage from '../../public/locales/en/gamepage.json'
import tLogin from '../../public/locales/en/login.json'
import translations from '../../public/locales/en/translation.json'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',

  // have a common namespace used around the full app
  ns: ['translations'],
  defaultNS: 'translations',

  interpolation: {
    escapeValue: false // not needed for react!!
  },

  resources: { en: { translations, gamepage: tGamepage, login: tLogin } }
})

export default i18n
