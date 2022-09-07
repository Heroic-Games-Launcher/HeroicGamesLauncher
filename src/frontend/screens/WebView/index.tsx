import React, { useContext, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, useParams } from 'react-router'

import { UpdateComponent } from 'frontend/components/UI'
import WebviewControls from 'frontend/components/UI/WebviewControls'
import ContextProvider from 'frontend/state/ContextProvider'
import { Runner, WebviewType } from 'common/types'
import './index.css'

type CODE = {
  authorizationCode: string
}

export default function WebView() {
  const { i18n } = useTranslation()
  const { pathname, search } = useLocation()
  const { t } = useTranslation()
  const { epic, gog } = useContext(ContextProvider)
  const [loading, setLoading] = useState<{
    refresh: boolean
    message: string
  }>(() => ({
    refresh: true,
    message: t('loading.website', 'Loading Website')
  }))
  const navigate = useNavigate()
  const webviewRef = useRef<WebviewType>(null)

  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const epicLoginUrl = 'https://legendary.gl/epiclogin'

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

  const handleSuccessfulLogin = () => {
    navigate('/login')
  }

  useLayoutEffect(() => {
    const webview = webviewRef.current
    if (webview) {
      const loadstop = () => {
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
        } else {
          webview.addEventListener('did-navigate', async () => {
            webview.focus()

            setTimeout(() => {
              webview.findInPage('authorizationCode')
            }, 500)
            webview.addEventListener('found-in-page', async () => {
              webview.focus()
              webview.selectAll()
              webview.copy()

              setTimeout(async () => {
                const text = await window.api.clipboardReadText()
                const { authorizationCode }: CODE = JSON.parse(text)

                try {
                  setLoading({
                    refresh: true,
                    message: t('status.logging', 'Logging In...')
                  })
                  await epic.login(authorizationCode)
                  handleSuccessfulLogin()
                } catch (error) {
                  console.error(error)
                  window.api.logError(String(error))
                }
              }, 500)
            })
          })
        }
      }

      webview.addEventListener('dom-ready', loadstop)

      return () => {
        webview.removeEventListener('dom-ready', loadstop)
      }
    }
    return
  }, [webviewRef.current])

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
      />
    </div>
  )
}
