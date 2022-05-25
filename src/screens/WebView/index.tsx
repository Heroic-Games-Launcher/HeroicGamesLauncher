import React, { useContext, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, useParams } from 'react-router'

import { UpdateComponent } from 'src/components/UI'
import WebviewControls from 'src/components/UI/WebviewControls'
import ContextProvider from 'src/state/ContextProvider'
import { Runner, WebviewType } from 'src/types'
import './index.css'

const { clipboard, ipcRenderer } = window.require('electron')

type SID = {
  sid: string
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

  const epicLoginUrl =
    'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
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
          setTimeout(() => {
            webview.addEventListener(
              'found-in-page',
              async (res) => {
                const data = res as Event & { result: { matches: number } }
                if (!data.result.matches) {
                  return
                }
                webview.focus()
                webview.selectAll()
                webview.copy()
                if (!clipboard.readText().match('sid')) {
                  return
                }
                const { sid }: SID = JSON.parse(clipboard.readText())
                try {
                  setLoading({
                    refresh: true,
                    message: t('status.logging', 'Logging In...')
                  })
                  await epic.login(sid)
                  handleSuccessfulLogin()
                } catch (error) {
                  console.error(error)
                  ipcRenderer.send('logError', error)
                }
              },
              { once: true }
            )
            webview.findInPage('sid')
          }, 500)
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
