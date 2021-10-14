import React from 'react'
import { useTranslation } from 'react-i18next'
import WebviewControls from 'src/components/UI/WebviewControls'

type ElWebview = {
  goBack: () => void
  goForward: () => void
  reload: () => void
  getURL: () => string
}

type Webview = HTMLWebViewElement & ElWebview

export default function EpicStore() {
  const { i18n } = useTranslation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const trueAsStr = 'true' as unknown as boolean | undefined
  const webview = document.querySelector('webview') as Webview

  return (
    <div>
      <WebviewControls webview={webview} />
      <webview
        partition="persist:epicstore"
        src={epicStore}
        style={{width:'100vw', height:'100vh'}}
        allowpopups={trueAsStr}
        useragent="Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko"
      />
    </div>
  )
}
