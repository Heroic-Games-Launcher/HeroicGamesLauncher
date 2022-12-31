import { I18nextProvider, initReactI18next } from 'react-i18next'
import HttpApi from 'i18next-http-backend'
import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import i18next from 'i18next'
import { initGamepad } from './helpers/gamepad'

import './index.scss'
import './themes.css'
import GlobalState from './state/GlobalState'
import { initShortcuts } from './helpers/shortcuts'
import { configStore } from './helpers/electronStores'
import { initOnlineMonitor } from './helpers/onlineMonitor'
import { defaultThemes } from './components/UI/ThemeSelector'
import Loading from './screens/Loading'

initOnlineMonitor()

window.addEventListener('error', (ev: ErrorEvent) => {
  window.api.logError(ev.error)
})

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
    returnEmptyString: false,
    returnNull: false,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    lng: languageCode,
    react: {
      useSuspense: true
    },
    supportedLngs: [
      'ar',
      'az',
      'be',
      'bg',
      'bs',
      'ca',
      'cs',
      'de',
      'el',
      'en',
      'es',
      'et',
      'eu',
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
      'nb_NO',
      'nl',
      'pl',
      'pt',
      'pt_BR',
      'ro',
      'ru',
      'sk',
      'sv',
      'ta',
      'tr',
      'uk',
      'vi',
      'zh_Hans',
      'zh_Hant'
    ]
  })

const container = document.getElementById('root')
const root = createRoot(container!) // createRoot(container!) if you use TypeScript
const App = lazy(async () => import('./App'))

root.render(
  <React.StrictMode>
    <GlobalState>
      <I18nextProvider i18n={i18next}>
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      </I18nextProvider>
    </GlobalState>
  </React.StrictMode>
)

// helper function to set the theme class and load custom css if needed
window.setTheme = async (themeClass: string) => {
  document.querySelector('style.customTheme')?.remove()

  if (
    themeClass !== 'default' &&
    !Object.keys(defaultThemes).includes(themeClass)
  ) {
    const cssContent = await window.api.getThemeCSS(themeClass)
    themeClass = themeClass
      .replace('.css', '') // remove extension
      .replace(/[\s.]/, '_') // remove dots and empty spaces
    const style = document.createElement('style')
    style.classList.add('customTheme')
    style.innerHTML = cssContent
    document.body.insertAdjacentElement('afterbegin', style)
  }

  document.body.className = themeClass
}

const themeClass = (configStore.get('theme') as string) || 'default'
window.setTheme(themeClass)

// helper function to generate images for steam
// image is centered, sides are padded with blurred image
// returns dataURL of the generated image

// This is added globally to be able to call it directly from the backend
window.imageData = async (
  src: string,
  cw: number,
  ch: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('CANVAS') as HTMLCanvasElement
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const img = document.createElement('IMG') as HTMLImageElement
    img.crossOrigin = 'anonymous' // prevents cors errors when exporting

    img.addEventListener(
      'load',
      function () {
        // measure canvas and image
        canvas.width = cw
        canvas.height = ch
        const imgWidth = img.width
        const imgHeight = img.height

        // calculate drawing of the background
        const bkgW = cw
        const bkgH = (imgHeight * cw) / imgWidth
        const bkgX = 0
        const bkgY = ch / 2 - bkgH / 2
        ctx.filter = 'blur(10px)' // add blur and draw
        ctx.drawImage(img, bkgX, bkgY, bkgW, bkgH)

        // calculate drawing of the foreground
        const drawH = ch
        const drawW = (imgWidth * ch) / imgHeight
        const drawY = 0
        const drawX = cw / 2 - drawW / 2
        ctx.filter = 'blur(0)' // remove blur and draw
        ctx.drawImage(img, drawX, drawY, drawW, drawH)

        // resolve with dataURL
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      },
      false
    )

    img.addEventListener('error', (error) => {
      reject(error)
    })

    // set src to trigger the callback
    img.src = src
  })
}
