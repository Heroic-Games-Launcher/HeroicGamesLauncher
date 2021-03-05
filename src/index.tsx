import React, { Suspense } from 'react'
import ReactDOM from 'react-dom'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import i18next from 'i18next'
import HttpApi from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

import './index.css'
import App from './App'
import GlobalState from './state/GlobalState'
import UpdateComponent from './components/UI/UpdateComponent'

const Backend = new HttpApi(null, {
  allowMultiLoading: false,
  addPath: 'build/locales/{{lng}}/{{ns}}',
  loadPath: 'locales/{{lng}}/{{ns}}.json',
})

i18next
  // load translation using http -> see /public/locales
  // learn more: https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    interpolation: {
      escapeValue: false,
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['de', 'en', 'es', 'fr', 'nl', 'pl', 'pt', 'ru', 'tr', 'hu'],
    react: {
      useSuspense: true,
    },
  })

ReactDOM.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18next}>
      <Suspense fallback={<UpdateComponent />}>
        <GlobalState>
          <App />
        </GlobalState>
      </Suspense>
    </I18nextProvider>
  </React.StrictMode>,
  document.getElementById('root')
)
