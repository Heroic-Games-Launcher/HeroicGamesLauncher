import { I18nextProvider, initReactI18next } from 'react-i18next'
import HttpApi from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'
import React, { Suspense } from 'react'
import ReactDOM from 'react-dom'
import i18next from 'i18next'

import './index.css'
import App from 'src/App'
import GlobalState from 'src/state/GlobalState'
import UpdateComponent from 'src/components/UI/UpdateComponent'

const Backend = new HttpApi(null, {
  addPath: 'build/locales/{{lng}}/{{ns}}',
  allowMultiLoading: false,
  loadPath: 'locales/{{lng}}/{{ns}}.json'
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
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    lng: 'en',
    react: {
      useSuspense: true
    },
    supportedLngs: ['de', 'en', 'es', 'fr', 'nl', 'pl', 'pt', 'ru', 'tr', 'hu']
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
