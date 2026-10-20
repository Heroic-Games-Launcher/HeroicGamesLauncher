import {
  ArrowBackOutlined,
  ArrowForwardRounded,
  OpenInBrowser,
  Replay
} from '@mui/icons-material'
import cx from 'classnames'
import React, { SyntheticEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SvgButton from '../SvgButton'
import './index.css'

interface WebviewControlsProps {
  webview: Electron.WebviewTag | null
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
  const [webviewGoBack, setWebviewGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  useEffect(() => {
    if (webview) {
      const updateNavigationState = () => {
        setUrl(webview.getURL())
        setWebviewGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      }

      webview.addEventListener('did-navigate-in-page', updateNavigationState)
      webview.addEventListener('did-navigate', updateNavigationState)
      webview.addEventListener('did-stop-loading', updateNavigationState)

      return () => {
        webview.removeEventListener(
          'did-navigate-in-page',
          updateNavigationState
        )
        webview.removeEventListener('did-navigate', updateNavigationState)
        webview.removeEventListener('did-stop-loading', updateNavigationState)
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
          if (webviewGoBack) {
            return webview?.goBack()
          } else {
            return history.back()
          }
        }
        if (event === 'forward') {
          return webview?.goForward()
        }
      } catch (error) {
        console.error(error)
      }
    },
    [webview, webviewGoBack]
  )

  return (
    <div className="WebviewControls">
      <div className="WebviewControls__icons">
        <SvgButton
          className="WebviewControls__icon"
          title={t('webview.controls.back')}
          onClick={() => handleButtons('back')}
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
