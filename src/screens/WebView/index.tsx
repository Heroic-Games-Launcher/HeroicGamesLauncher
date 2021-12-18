import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import WebviewControls from 'src/components/UI/WebviewControls'
import { Webview } from 'src/types'

import './index.css'

export default function WebView() {
  const { i18n } = useTranslation()
  const { pathname } = useLocation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const wikiURL =
    'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'

  const trueAsStr = 'true' as unknown as boolean | undefined
  const webview = document.querySelector('webview') as Webview

  const urls = {
    '/epicstore': epicStore,
    '/wiki': wikiURL
  }

  return (
    <div className="webViewContainer">
      <WebviewControls webview={webview} initURL={urls[pathname]} />
      <webview
        partition="persist:epicstore"
        src={urls[pathname]}
        allowpopups={trueAsStr}
        useragent="Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko"
      />
    </div>
  )
}
