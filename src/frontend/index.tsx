import { I18nextProvider, initReactI18next } from 'react-i18next'
import HttpApi from 'i18next-http-backend'
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom'
import i18next from 'i18next'
import { initGamepad } from './helpers/gamepad'

import './index.css'
import './themes.css'
import App from './App'
import GlobalState from './state/GlobalState'
import { UpdateComponentBase } from './components/UI/UpdateComponent'
import { initShortcuts } from './helpers/shortcuts'
import { configStore } from './helpers/electronStores'

const Backend = new HttpApi(null, {
  addPath: 'build/locales/{{lng}}/{{ns}}',
  allowMultiLoading: false,
  loadPath: 'locales/{{lng}}/{{ns}}.json'
})

initGamepad()
initShortcuts()

const storage: Storage = window.localStorage

let languageCode: string | undefined = configStore.get('language') as string

if (!languageCode) {
  languageCode = storage.getItem('language') || 'en'
  configStore.set('language', languageCode)
}

i18next
  // load translation using http -> see /public/locales
  // learn more: https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    lng: languageCode,
    react: {
      useSuspense: true
    },
    supportedLngs: [
      'bg',
      'ca',
      'cs',
      'de',
      'el',
      'en',
      'es',
      'et',
      'fa',
      'fi',
      'fr',
      'gl',
      'hr',
      'hu',
      'ja',
      'ko',
      'id',
      'it',
      'ml',
      'nl',
      'pl',
      'pt',
      'pt_BR',
      'ru',
      'sv',
      'ta',
      'tr',
      'uk',
      'vi',
      'zh_Hans',
      'zh_Hant'
    ]
  })

const themeClass = (configStore.get('theme') as string) || 'default'
document.body.className = themeClass

ReactDOM.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18next}>
      <Suspense fallback={<UpdateComponentBase message="Loading" />}>
        <GlobalState>
          <App />
        </GlobalState>
      </Suspense>
    </I18nextProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
