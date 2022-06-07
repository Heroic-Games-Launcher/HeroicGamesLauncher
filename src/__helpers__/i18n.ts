import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import tGamepage from '../../public/locales/en/gamepage.json'
import tLogin from '../../public/locales/en/login.json'
import translations from '../../public/locales/en/translation.json'

i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['translations', 'gamepage', 'login'],
  defaultNS: 'translations',
  resources: { en: { translations, gamepage: tGamepage, login: tLogin } }
})

export default i18n
