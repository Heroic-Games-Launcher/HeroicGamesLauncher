import React, { useContext, useLayoutEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useParams, useHistory } from 'react-router'

import { UpdateComponent } from 'src/components/UI'
import WebviewControls from 'src/components/UI/WebviewControls'
import ContextProvider from 'src/state/ContextProvider'
import { Runner, Webview } from 'src/types'

const { clipboard, ipcRenderer } = window.require('electron')
import './index.css'

// type Props = {
//   isLogin?: boolean
//   runner?: Runner
// }

type SID = {
  sid: string
}

export default function WebView() {
  const { i18n } = useTranslation()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { handleFilter, handleCategory } = useContext(ContextProvider)
  const [loading, setLoading] = useState<{
    refresh: boolean
    message: string
  }>({ refresh: true, message: t('loading.website', 'Loading Website') })
  const history = useHistory()

  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const loginUrl =
    'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const wikiURL =
    'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
  const gogEmbedRegExp = new RegExp('https://embed.gog.com/on_login_success?')
  const gogLoginUrl =
    'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy'

  const trueAsStr = 'true' as unknown as boolean | undefined
  const webview = document.querySelector('webview') as Webview
  const { runner } = useParams() as { runner: Runner }
  const startUrl = runner
    ? runner == 'legendary'
      ? '/loginEpic'
      : '/loginGOG'
    : pathname
  const urls = {
    '/epicstore': epicStore,
    '/wiki': wikiURL,
    '/loginEpic': loginUrl,
    '/loginGOG': gogLoginUrl
  }

  useLayoutEffect(() => {
    const webview = document.querySelector('webview') as Webview
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
            ipcRenderer.invoke('authGOG', code).then(() => {
              setLoading({
                refresh: false,
                message: t('status.logging', 'Logging In...')
              })
              handleCategory('gog')
              history.push('/login')
              window.location.reload()
            })
          }
        }
        // Deals with Login
        else {
          setTimeout(() => {
            webview.findInPage('sid')
            webview.addEventListener('found-in-page', async (res) => {
              const data = res as Event & { result: { matches: number } }
              if (data.result.matches) {
                webview.focus()
                webview.selectAll()
                webview.copy()
                const { sid }: SID = JSON.parse(clipboard.readText())
                try {
                  setLoading({
                    refresh: true,
                    message: t('status.logging', 'Logging In...')
                  })
                  await ipcRenderer.invoke('login', sid)
                  handleFilter('all')
                  handleCategory('epic')
                  setLoading({ ...loading, refresh: false })
                  history.push('/login')
                } catch (error) {
                  console.error(error)
                  ipcRenderer.send('logError', error)
                }
              }
            })
          }, 500)
        }
      }

      webview.addEventListener('dom-ready', loadstop)
    }
  }, [])

  return (
    <div className="webViewContainer">
      <WebviewControls webview={webview} initURL={urls[startUrl]} />
      {loading.refresh && <UpdateComponent message={loading.message} />}
      <webview
        partition="persist:epicstore"
        src={urls[startUrl]}
        allowpopups={trueAsStr}
      />
    </div>
  )
}
