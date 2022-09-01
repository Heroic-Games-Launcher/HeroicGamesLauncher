import React, {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, useParams } from 'react-router'

import { UpdateComponent } from 'src/components/UI'
import WebviewControls from 'src/components/UI/WebviewControls'
import { ipcRenderer } from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import { Runner, WebviewType } from 'src/types'
import './index.css'

export default function WebView() {
  const { i18n } = useTranslation()

  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const { pathname, search } = useLocation()

  const epicLoginUrl = 'https://www.epicgames.com/id/login'
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const gogStore = `https://gog.com`
  const wikiURL =
    'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
  const gogEmbedRegExp = new RegExp('https://embed.gog.com/on_login_success?')
  const gogLoginUrl =
    'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy'

  const trueAsStr = 'true' as unknown as boolean | undefined
  const { runner } = useParams() as { runner: Runner }

  const urls = {
    '/epicstore': epicStore,
    '/gogstore': gogStore,
    '/wiki': wikiURL,
    '/loginEpic': epicLoginUrl,
    '/loginGOG': gogLoginUrl,
    '/loginweb/legendary': epicLoginUrl,
    '/loginweb/gog': gogLoginUrl
  }
  let startUrl = urls[pathname]

  if (pathname.match(/store-page/)) {
    const searchParams = new URLSearchParams(search)
    const queryParam = searchParams.get('store-url')
    if (queryParam) {
      startUrl = queryParam
    }
  }

  const { t } = useTranslation()
  const { gog, epic } = useContext(ContextProvider)
  const [loading, setLoading] = useState<{
    refresh: boolean
    message: string
  }>(() => ({
    refresh: true,
    message: t('loading.website', 'Loading Website')
  }))
  const navigate = useNavigate()
  const webviewRef = useRef<WebviewType>(null)

  const isEpicLogin = runner === 'legendary' && startUrl === epicLoginUrl

  const [preloadPath, setPreloadPath] = useState('')

  useEffect(() => {
    let mounted = true
    const fetchLocalPreloadPath = async () => {
      const path = (await ipcRenderer.invoke('getLocalPeloadPath')) as unknown
      if (mounted) {
        setPreloadPath(path as string)
      }
    }

    if (isEpicLogin) {
      fetchLocalPreloadPath()
    }

    return () => {
      mounted = false
    }
  }, [])

  const handleSuccessfulLogin = () => {
    navigate('/login')
  }

  useEffect(() => {
    if (isEpicLogin) {
      ipcRenderer.addListener('epicLoginResponse', async (event, response) => {
        const status = await epic.login(response)
        if (status === 'done') {
          handleSuccessfulLogin()
        }
      })

      return () => {
        ipcRenderer.removeListener('epicLoginResponse', epic.login)
      }
    } else {
      return
    }
  }, [epic.login])

  useLayoutEffect(() => {
    const webview = webviewRef.current
    if (webview && ((preloadPath && isEpicLogin) || !isEpicLogin)) {
      const loadstop = () => {
        /* eslint-disable */
        setLoading({ ...loading, refresh: false })
        // Ignore the login handling if not on login page
        if (!runner) {
          return
        } else if (runner === 'gog') {
          const pageUrl = webview.getURL()
          if (pageUrl.match(gogEmbedRegExp)) {
            const parsedURL = new URL(pageUrl)
            const code = parsedURL.searchParams.get('code')
            setLoading({
              refresh: true,
              message: t('status.logging', 'Logging In...')
            })
            if (code) {
              gog.login(code).then(() => {
                handleSuccessfulLogin()
              })
            }
          }
        }
      }

      webview.addEventListener('dom-ready', loadstop)

      return () => {
        webview.removeEventListener('dom-ready', loadstop)
      }
    }
    return
  }, [webviewRef.current, preloadPath])

  if (!preloadPath && isEpicLogin) {
    return <></>
  }

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
        preload={preloadPath}
      />
    </div>
  )
}
