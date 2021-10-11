import React from 'react'
import { useTranslation } from 'react-i18next'

export default function EpicStore() {
  const { i18n } = useTranslation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  const trueAsStr = 'true' as unknown as boolean | undefined

  return (
    <div>
      <webview partition="persist:epicstore" id="foo" src={epicStore} style={{width:'100vw', height:'100vh'}} allowpopups={trueAsStr} />
    </div>
  )
}
