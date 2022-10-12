import {
  ArrowBackOutlined,
  ArrowForwardRounded,
  OpenInBrowser,
  Replay
} from '@mui/icons-material'
import cx from 'classnames'
import React, { SyntheticEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WebviewType } from 'common/types'
import SvgButton from '../SvgButton'
import './index.css'

export interface WebviewControlsProps {
  webview: WebviewType | null
  initURL: string
  openInBrowser: boolean
}

function removeSelection(event: SyntheticEvent<unknown>) {
  const selection = window.getSelection()
  if (
    selection &&
    selection.anchorNode &&
    selection.anchorNode.contains(event.target as Node)
  ) {
    selection.removeAllRanges()
  }
}

export default function WebviewControls({
  webview,
  initURL,
  openInBrowser
}: WebviewControlsProps) {
  const [url, setUrl] = React.useState(initURL)
  const { t } = useTranslation()
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  useEffect(() => {
    if (webview) {
      const eventCallback = () => setUrl(webview.getURL())
      webview.addEventListener('did-navigate-in-page', eventCallback)
      webview.addEventListener('did-navigate', eventCallback)
      webview.addEventListener('did-navigate-in-page', () => {
        setCanGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      })
      webview.addEventListener('did-navigate', () => {
        setCanGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      })
      return () => {
        webview.removeEventListener('did-navigate-in-page', eventCallback)
        webview.removeEventListener('did-navigate', eventCallback)
      }
    }
    return
  }, [webview])

  const handleButtons = useCallback(
    (event: 'reload' | 'back' | 'forward') => {
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
    },
    [webview]
  )

  return (
    <div className="WebviewControls">
      <div className="WebviewControls__icons">
        <SvgButton
          className="WebviewControls__icon"
          title={t('webview.controls.back')}
          onClick={() => handleButtons('back')}
          disabled={!canGoBack}
        >
          <ArrowBackOutlined />
        </SvgButton>
        <SvgButton
          className="WebviewControls__icon"
          title={t('webview.controls.forward')}
          onClick={() => handleButtons('forward')}
          disabled={!canGoForward}
        >
          <ArrowForwardRounded />
        </SvgButton>
        <SvgButton
          className="WebviewControls__icon"
          title={t('webview.controls.reload')}
          onClick={() => handleButtons('reload')}
        >
          <Replay />
        </SvgButton>
      </div>
      <span className="WebviewControls__url">
        {url && (
          <input
            className={cx('WebviewControls__urlInput', {
              ['WebviewControls__urlInput--warning']:
                !url.startsWith('https://')
            })}
            type="text"
            readOnly={true}
            value={url}
            onBlur={removeSelection}
          />
        )}
      </span>
      <div className="WebviewControls__icons">
        <SvgButton
          className="WebviewControls__icon"
          title={t('webview.controls.openInBrowser')}
          disabled={!openInBrowser || !url}
          onClick={() => window.api.openWebviewPage(url)}
        >
          <OpenInBrowser />
        </SvgButton>
      </div>
    </div>
  )
}
