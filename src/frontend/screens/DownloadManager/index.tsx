import './index.css'

import React, { lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { InstallParams } from 'common/types'
import { UpdateComponent } from 'frontend/components/UI'

const DownloadManagerItem = lazy(
  async () =>
    import('frontend/screens/DownloadManager/components/DownloadManagerItem')
)

export default function DownloadManager(): JSX.Element | null {
  const { t } = useTranslation()
  const [refreshing, setRefreshing] = useState(false)
  const [queueElements, setQueueElements] = useState<InstallParams[]>([])

  useEffect(() => {
    setRefreshing(true)
    window.api.getDMQueueInformation().then((elements) => {
      setQueueElements(elements)
      setRefreshing(false)
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e: Electron.IpcRendererEvent, elements: InstallParams[]) => {
        setQueueElements(elements)
      }
    )

    return () => {
      removeHandleDMQueueInformation()
    }
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  return (
    <>
      <h2>{t('download.manager.title', 'Download Manager (Beta)')}</h2>
      {queueElements?.length ? (
        <div className="wineManager">
          <div
            style={
              !queueElements.length ? { backgroundColor: 'transparent' } : {}
            }
            className="wineList"
          >
            <div className="gameListHeader">
              <span>{t('download.manager.queue.element', 'Name')}</span>
              <span>{t('download.manager.queue.release', 'Release Date')}</span>
              <span>{t('download.manager.queue.size', 'Size')}</span>
              <span>{t('download.manager.queue.actions', 'Action')}</span>
            </div>
            {!!queueElements.length &&
              queueElements.map((element, key) => {
                return <DownloadManagerItem key={key} {...element} />
              })}
          </div>
        </div>
      ) : (
        <h3>{t('download.manager.empty', 'Nothing to download.')}</h3>
      )}
    </>
  )
}
