import React from 'react'
import { ArrowBackOutlined, ArrowForwardRounded, Replay10Outlined } from '@material-ui/icons'
import './index.css'
import { Webview } from 'src/types'

type Props = {
  webview: Webview
}

export default function index({webview}: Props) {
  const [url, setUrl] = React.useState('')

  if (webview) {
    webview.addEventListener('page-title-updated', () => setUrl(webview.getURL()))
  }

  return (
    <div className="webviewControls">
      <div className="webviewIcons">
        <ArrowBackOutlined onClick={() => webview?.goBack()} />
        <ArrowForwardRounded onClick={() => webview?.goForward()} />
        <Replay10Outlined onClick={() => webview?.reload()} />
      </div>
      <span className="webviewURL"> {url && <span>{url}</span>}</span>

    </div>
  )
}
