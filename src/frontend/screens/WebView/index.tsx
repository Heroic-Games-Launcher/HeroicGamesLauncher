import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, useParams } from 'react-router-dom'

import { ToggleSwitch, UpdateComponent } from 'frontend/components/UI'
import WebviewControls from 'frontend/components/UI/WebviewControls'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import LoginWarning from '../Login/components/LoginWarning'
import { NileLoginData } from 'common/types/nile'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'

const validStoredUrl = (url: string, store: string) => {
  switch (store) {
    case 'epic':
      return url.includes('epicgames.com')
    case 'gog':
      return url.includes('gog.com')
    case 'amazon':
      return url.includes('gaming.amazon.com')
    default:
      return false
  }
}

export default function WebView() {
  const { i18n } = useTranslation()
  const { pathname, search } = useLocation()
  const { t } = useTranslation()
  const { epic, gog, amazon, connectivity } = useContext(ContextProvider)
  const [loading, setLoading] = useState<{
    refresh: boolean
    message: string
  }>(() => ({
    refresh: true,
    message: t('loading.website', 'Loading Website')
  }))
  const [amazonLoginData, setAmazonLoginData] = useState<NileLoginData | null>(
    null
  )
  const navigate = useNavigate()
  const webviewRef = useRef<Electron.WebviewTag>(null)

  // `store` is set to epic/gog/amazon depending on which storefront we're
  // supposed to show, `runner` is set to a runner if we're supposed to show its
  // login prompt
  const { store, runner } = useParams()

  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const epicLoginUrl = 'https://www.epicgames.com/id/login?responseType=code'

  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const gogStore = `https://af.gog.com?as=1838482841`
  const amazonStore = `https://gaming.amazon.com`
  const wikiURL =
    'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
  const gogEmbedRegExp = new RegExp('https://embed.gog.com/on_login_success?')
  const gogLoginUrl =
    'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy'

  const trueAsStr = 'true' as unknown as boolean | undefined

  const urls: { [pathname: string]: string } = {
    '/store/epic': epicStore,
    '/store/gog': gogStore,
    '/store/amazon': amazonStore,
    '/wiki': wikiURL,
    '/loginEpic': epicLoginUrl,
    '/loginGOG': gogLoginUrl,
    '/loginweb/legendary': epicLoginUrl,
    '/loginweb/gog': gogLoginUrl,
    '/loginweb/nile': amazonLoginData ? amazonLoginData.url : ''
  }
  let startUrl = urls[pathname]

  if (store) {
    sessionStorage.setItem('last-store', store)
    const lastUrl = sessionStorage.getItem(`last-url-${store}`)
    if (lastUrl && validStoredUrl(lastUrl, store)) {
      startUrl = lastUrl
    }
  }

  if (pathname.match(/store-page/)) {
    const searchParams = new URLSearchParams(search)
    const queryParam = searchParams.get('store-url')
    if (queryParam) {
      startUrl = queryParam
    }
  }

  useEffect(() => {
    if (pathname !== '/loginweb/nile') return
    console.log('Loading amazon login data')

    setLoading({
      refresh: true,
      message: t('status.preparing_login', 'Preparing Login...')
    })
    amazon.getLoginData().then((data) => {
      setAmazonLoginData(data)
      setLoading({
        ...loading,
        refresh: false
      })
    })
  }, [pathname])

  const handleAmazonLogin = (code: string) => {
    if (!amazonLoginData) {
      console.error('Could not login to Amazon because login data is missing')
      return
    }

    setLoading({
      refresh: true,
      message: t('status.logging', 'Logging In...')
    })
    amazon
      .login({
        client_id: amazonLoginData.client_id,
        code: code,
        code_verifier: amazonLoginData.code_verifier,
        serial: amazonLoginData.serial
      })
      .then(() => {
        handleSuccessfulLogin()
      })
  }

  const handleSuccessfulLogin = () => {
    navigate('/login')
  }

  useLayoutEffect(() => {
    const webview = webviewRef.current
    if (webview) {
      const loadstop = async () => {
        setLoading({ ...loading, refresh: false })
        // Ignore the login handling if not on login page
        if (!runner) {
          return
        } else if (runner === 'gog') {
          const pageUrl = webview.getURL()
          if (pageUrl.match(gogEmbedRegExp)) {
            const parsedURL = new URL(pageUrl)
            const code = parsedURL.searchParams.get('code')
            if (code) {
              setLoading({
                refresh: true,
                message: t('status.logging', 'Logging In...')
              })
              gog.login(code).then(() => handleSuccessfulLogin())
            }
          }
        } else if (runner === 'nile') {
          const pageURL = webview.getURL()
          const parsedURL = new URL(pageURL)
          const code = parsedURL.searchParams.get(
            'openid.oa2.authorization_code'
          )
          if (code) {
            handleAmazonLogin(code)
          }
        } else if (runner == 'legendary') {
          const pageUrl = webview.getURL()
          const parsedUrl = new URL(pageUrl)
          if (parsedUrl.hostname === 'localhost') {
            const code = parsedUrl.searchParams.get('code')
            if (code) {
              setLoading({
                refresh: true,
                message: t('status.logging', 'Logging In...')
              })
              epic.login(code).then(() => handleSuccessfulLogin())
            }
          }
        }
      }

      const onerror = ({ validatedURL }: Electron.DidFailLoadEvent) => {
        if (validatedURL && validatedURL.match(/track\.adtraction\.com/)) {
          const parsedUrl = new URL(validatedURL)
          const redirectUrl = parsedUrl.searchParams.get('url')
          const url = new URL(redirectUrl || 'https://gog.com')
          // Remove any port definitions
          // Recently GOG made a change where they started to provide a port
          // in a URL that adtraction is supposed to redirect to.
          // This leads to urls like https://gog.com:80
          // That address is unreachable
          //
          // Add a entry below if you notice this line of code and cringe
          // - username - DD/MM/YY
          // - imLinguin - 01/07/24
          url.port = ''
          webview.loadURL(url.toString())
          if (!localStorage.getItem('adtraction-warning')) {
            setShowAdtractionWarning(true)
          }
        }
      }

      webview.addEventListener('dom-ready', loadstop)
      webview.addEventListener('did-fail-load', onerror)
      // if the page title changed it's because the store loaded so there's
      // connectivity, we can update the status without waiting for the checks
      const updateConnectivity = () => {
        if (connectivity.status !== 'online') {
          window.api.setConnectivityOnline()
        }
      }
      webview.addEventListener('page-title-updated', updateConnectivity)

      return () => {
        webview.removeEventListener('dom-ready', loadstop)
        webview.removeEventListener('did-fail-load', onerror)
        webview.removeEventListener('page-title-updated', updateConnectivity)
      }
    }
    return
  }, [webviewRef.current, amazonLoginData, runner])

  useEffect(() => {
    const webview = webviewRef.current
    if (webview && store) {
      const onNavigate = () => {
        const url = webview.getURL()
        if (validStoredUrl(url, store)) {
          sessionStorage.setItem(`last-url-${store}`, webview.getURL())
        }
      }

      // this one is needed for gog/amazon
      webview.addEventListener('did-navigate', onNavigate)
      // this one is needed for epic
      webview.addEventListener('did-navigate-in-page', onNavigate)

      return () => {
        webview.removeEventListener('did-navigate', onNavigate)
        webview.removeEventListener('did-navigate-in-page', onNavigate)
      }
    }

    return
  }, [webviewRef.current, store])

  const [showLoginWarningFor, setShowLoginWarningFor] = useState<
    null | 'epic' | 'gog' | 'amazon'
  >(null)

  const [showAdtractionWarning, setShowAdtractionWarning] =
    useState<boolean>(false)

  const [dontShowAdtractionWarning, setDontShowAdtractionWarning] =
    useState<boolean>(false)

  useEffect(() => {
    if (
      startUrl.match(/epicgames\.com/) &&
      startUrl.indexOf('/id/login') < 0 &&
      !epic.username
    ) {
      setShowLoginWarningFor('epic')
    } else if (
      startUrl.match(/gog\.com/) &&
      !startUrl.match(/auth\.gog\.com/) &&
      !gog.username
    ) {
      setShowLoginWarningFor('gog')
    } else if (startUrl.match(/gaming\.amazon\.com/) && !amazon.user_id) {
      setShowLoginWarningFor('amazon')
    } else {
      setShowLoginWarningFor(null)
    }
  }, [startUrl])

  const onLoginWarningClosed = () => {
    setShowLoginWarningFor(null)
  }

  const userAgent =
    startUrl === epicLoginUrl
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EpicGamesLauncher'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/200.0 HeroicGamesLauncher'

  return (
    <div className="WebView">
      {webviewRef.current && (
        <WebviewControls
          webview={webviewRef.current}
          initURL={startUrl}
          openInBrowser={!startUrl.startsWith('login')}
        />
      )}
      {loading.refresh && <UpdateComponent message={loading.message} />}
      <webview
        ref={webviewRef}
        className="WebView__webview"
        partition="persist:epicstore"
        src={startUrl}
        allowpopups={trueAsStr}
        useragent={userAgent}
      />
      {showLoginWarningFor && (
        <LoginWarning
          warnLoginForStore={showLoginWarningFor}
          onClose={onLoginWarningClosed}
        />
      )}
      {showAdtractionWarning && (
        <Dialog
          showCloseButton={true}
          onClose={() => {
            setShowAdtractionWarning(false)
            if (dontShowAdtractionWarning)
              localStorage.setItem('adtraction-warning', 'true')
          }}
        >
          <DialogHeader
            onClose={() => {
              setShowAdtractionWarning(false)
              if (dontShowAdtractionWarning)
                localStorage.setItem('adtraction-warning', 'true')
            }}
          >
            {t('adtraction-locked.title', 'Adtraction is blocked')}
          </DialogHeader>
          <DialogContent>
            <p>
              {t(
                'adtraction-locked.description',
                'It seems the track.adtraction.com domain was unable to load or is blocked. With adtraction, any purchase you make in the GOG store supports Heroic financially. Consider removing the block if you wish to contribute.'
              )}
            </p>
            <ToggleSwitch
              htmlId="dont-show-adtraction-warning-checkbox"
              value={dontShowAdtractionWarning}
              handleChange={(e) =>
                setDontShowAdtractionWarning(e.target.checked)
              }
              title={t(
                'adtraction-locked.dont-show-again',
                "Don't show this warning again"
              )}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
