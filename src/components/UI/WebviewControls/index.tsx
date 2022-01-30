import React from 'react'
import {
  ArrowBackOutlined,
  ArrowForwardRounded,
  Replay10Outlined
} from '@mui/icons-material'
import './index.css'
import { Webview } from 'src/types'

type Props = {
  webview: Webview
  initURL: string
}

export default function index({ webview, initURL }: Props) {
  const [url, setUrl] = React.useState(initURL)

  if (webview) {
    webview.addEventListener('update-target-url', () =>
      setUrl(webview.getURL())
    )
  }

  function handleButtons(event: 'reload' | 'back' | 'forward') {
    try {
      if (event === 'reload') {
        return webview?.reload()
      }
      if (event === 'back') {
        return webview?.goBack()
      }
      if (event === 'forward') {
        return webview?.goForward()
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="webviewControls">
      <div className="webviewIcons">
        <ArrowBackOutlined onClick={() => handleButtons('back')} />
        <ArrowForwardRounded onClick={() => handleButtons('forward')} />
        <Replay10Outlined onClick={() => handleButtons('reload')} />
      </div>
      <span className="webviewURL"> {url && <span>{url}</span>}</span>
    </div>
  )
}
