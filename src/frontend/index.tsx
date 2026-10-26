import { I18nextProvider, initReactI18next } from 'react-i18next'
import HttpApi from 'i18next-http-backend'
import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import i18next, { Resource, ResourceLanguage } from 'i18next'
import { initGamepad } from './helpers/gamepad'

import './index.scss'
import './themes.scss'
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

const DEFAULT_THEME = 'midnightMirage'

const Backend = new HttpApi(null, {
  addPath: 'build/locales/{{lng}}/{{ns}}',
  loadPath: 'locales/{{lng}}/{{ns}}.json'
})

initGamepad()
initShortcuts()

const storage: Storage = window.localStorage
storage.removeItem('nonAvailableGames')

const languageCode: string =
  configStore.get_nodefault('language') ?? storage.getItem('language') ?? 'en'
configStore.set('language', languageCode)
document.querySelector('html')?.setAttribute('lang', languageCode)

window.setCustomCSS = (cssString: string) => {
  const style = document.createElement('style')
  style.innerHTML = cssString
  document.getElementById('customCSS')!.innerText = style.innerText
}

window.api
  .getCustomCSS()
  .then(window.setCustomCSS)
  .catch(() => {})

const container = document.getElementById('root')
const root = createRoot(container!) // createRoot(container!) if you use TypeScript
const App = lazy(async () => import('./App'))

// Namespaces the app actually uses. Preloading these for the active language
// (and the English fallback) lets the UI render immediately and without a
// network connection, even if the initial i18n load would otherwise hang.
const BUNDLED_NAMESPACES = ['translation', 'gamepage', 'login']

const bundledResources: Resource = {}

// Fetch with a hard timeout so a stalled local request can never block
// i18next.init() (and therefore the first paint) forever.
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  )
}

async function preloadBundledLanguage(lng: string): Promise<ResourceLanguage> {
  const data: ResourceLanguage = {}
  for (const ns of BUNDLED_NAMESPACES) {
    try {
      const res = await fetchWithTimeout(`locales/${lng}/${ns}.json`, 4000)
      if (res.ok) data[ns] = await res.json()
    } catch {
      // ignore; the http backend will still attempt to load this namespace
    }
  }
  return data
}

// i18next resolves a stored language code to a supported one (e.g. fr-CA ->
// fr, en-GB -> en). Preload both the raw code and its base form so the bundle
// i18next actually looks up is always present.
function resolvedLanguageCodes(code: string): string[] {
  const base = code.split('-')[0].toLowerCase()
  const codes = new Set<string>([code, base, 'en'])
  return [...codes]
}

// The whole tree (including the <Loading/> fallback) suspends on i18next via
// react-i18next's `useSuspense`. If the initial resource load ever stalls
// (e.g. a network adapter is present but has no usable route) the UI would be
// left frozen before it finishes initializing. Preloading the active language
// into i18next's resource store guarantees those namespaces are already
// loaded, so the Suspense boundary releases right away and first paint no
// longer depends on the network.
async function bootstrapI18n() {
  await Promise.all(
    resolvedLanguageCodes(languageCode).map(async (lng) => {
      bundledResources[lng] = await preloadBundledLanguage(lng)
    })
  )

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
      // the active language (and English fallback) are preloaded above, so
      // they never need a network fetch; other languages still load on demand
      resources: bundledResources,
      partialBundledLanguages: true,
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
        'ga',
        'gl',
        'he',
        'hr',
        'hu',
        'ja',
        'ko',
        'lt',
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
        'sr',
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

  root.render(
    // <React.StrictMode>
    <GlobalState>
      <I18nextProvider i18n={i18next}>
        <Suspense fallback={<Loading />}>
          <App />
        </Suspense>
      </I18nextProvider>
    </GlobalState>
    // </React.StrictMode>
  )
}

void bootstrapI18n()

// helper function to set the theme class and load custom css if needed
window.setTheme = async (themeClass: string) => {
  document.querySelector('style.customTheme')?.remove()

  if (
    themeClass !== DEFAULT_THEME &&
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

  if (navigator.windowControlsOverlay.visible) {
    const titlebarOverlay = Object.fromEntries(
      ['height', 'color', 'symbol-color']
        .map((item) => [
          item === 'symbol-color' ? 'symbolColor' : item,
          getComputedStyle(document.body)
            .getPropertyValue(`--titlebar-${item}`)
            .trim()
        ])
        .filter(([, val]) => !!val)
    )
    window.api.setTitleBarOverlay(titlebarOverlay)
  }
}

const themeClass = configStore.get('theme', DEFAULT_THEME)
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
      reject(new Error(error.message, { cause: error }))
    })

    // set src to trigger the callback
    img.src = src
  })
}
