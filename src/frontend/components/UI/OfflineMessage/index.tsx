import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import './index.scss'

const OfflineMessage = () => {
  const { t } = useTranslation()
  const { connectivity, forkMode } = useContext(ContextProvider)

  const isOffline = forkMode === 'offline' || connectivity.status === 'offline'
  const isChecking = connectivity.status === 'check-online'

  // render nothing if online
  if (!isOffline && !isChecking) {
    return <></>
  }

  let content = t('offline-message.offline', 'Offline')

  if (forkMode === 'offline') {
    content = t('offline-message.offline-mode', 'Offline Mode (manual)')
  } else if (connectivity.status === 'check-online') {
    if (connectivity.retryIn) {
      content = t('offline-message.offline-retry-in', {
        defaultValue: 'Offline. Retrying in {{seconds}} seconds.',
        seconds: connectivity.retryIn
      })
    } else {
      content = t('offline-message.retrying', 'Retrying...')
    }
  }

  const hintHtml = t('offline-message.hint', {
    defaultValue:
      'We are checking the connectivity against:{{newline}}github.com,{{newline}}gog.com,{{newline}}store.epicgames.com and{{newline}}cloudflare-dns.com',
    newline: '<br />'
  })

  const onIgnore = () => {
    window.api.setConnectivityOnline()
  }

  return (
    <div className="offline-message">
      <span>
        {content}
        <button className="ignore" onClick={onIgnore}>
          ({t('offline-message.ignore', 'Ignore')})
        </button>
      </span>
      <button className="hint-hover">?</button>
      <span
        className="retry-hint"
        dangerouslySetInnerHTML={{ __html: hintHtml }}
      ></span>
    </div>
  )
}

export default OfflineMessage
