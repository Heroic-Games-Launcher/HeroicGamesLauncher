import ContextProvider from 'frontend/state/ContextProvider'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'

import './index.css'

const OfflineMessage = () => {
  const { t } = useTranslation()
  const { connectivity } = useContext(ContextProvider)

  // render nothing if online
  if (connectivity.status === 'online') {
    return <></>
  }

  let content = t('offline-message.offline', 'Offline')

  if (connectivity.status === 'check-online') {
    if (connectivity.retryIn) {
      content += t('offline-message.retry-in', {
        defaultValue: 'Retrying in ... {{seconds}} seconds',
        seconds: connectivity.retryIn
      })
    } else {
      content = t('offline-message.retrying', 'Retrying')
    }
  }

  const hintHtml = t('offline-message.hint', {
    defaultValue:
      'We are checking the connectivity against:{{newline}}github.com,{{newline}}gog.com and{{newline}}store.epicgames.com',
    newline: '<br />'
  })

  return (
    <div className="offline-message">
      <span>{content}</span>
      <button className="hint-hover">?</button>
      <span
        className="retry-hint"
        dangerouslySetInnerHTML={{ __html: hintHtml }}
      ></span>
    </div>
  )
}

export default OfflineMessage
