import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { UpdateComponent } from 'src/components/UI'
import WebviewControls from 'src/components/UI/WebviewControls'
import { Webview } from 'src/types'
const { clipboard } = window.require('electron')
import './index.css'

type Props = {
  isLogin?: boolean
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36 Edg/90.0.818.46'

export default function WebView({ isLogin }: Props) {
  const { i18n } = useTranslation()
  const { pathname } = useLocation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const [loading, setLoading] = React.useState(false)

  const loginUrl =
    'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const wikiURL =
    'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'

  const trueAsStr = 'true' as unknown as boolean | undefined
  const webview = document.querySelector('webview') as Webview

  const startUrl = isLogin ? '/login' : pathname
  const urls = {
    '/epicstore': epicStore,
    '/wiki': wikiURL,
    '/login': loginUrl
  }

  React.useEffect(() => {
    const webview = document.querySelector('webview') as Webview
    if (webview) {
      const loadstart = () => {
        setLoading(true)
      }

      const loadstop = () => {
        setLoading(false)
        console.log(webview.getURL())
      }

      const newUrl = () => {
        console.log('changedUrl')
        console.log(webview.getURL())
      }

      const redirectUrl = () => {
        console.log('redirect')
        console.log(webview.getURL())
      }

      webview.addEventListener('dom-ready', async () => {
        //        console.log(webview.getURL())
        webview.selectAll()
        webview.copy()
        const text = clipboard.readText()
        console.log({ text })
      })

      webview.addEventListener('did-start-loading', loadstart)
      webview.addEventListener('did-stop-loading', loadstop)
      webview.addEventListener('did-navigate-in-page', newUrl)
      webview.addEventListener('did-redirect-navigation', redirectUrl)
    }
  })

  return (
    <div className="webViewContainer">
      <WebviewControls webview={webview} initURL={urls[startUrl]} />
      {loading && <UpdateComponent />}
      <webview
        partition="persist:epicstore"
        src={urls[startUrl]}
        allowpopups={trueAsStr}
        useragent={USER_AGENT}
      />
    </div>
  )
}
