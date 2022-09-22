import './index.css'

import React, { lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DMQueueElement } from 'common/types'
import { UpdateComponent } from 'frontend/components/UI'
import ProgressChart from './components/ProgressChart'

const DownloadManagerItem = lazy(
  async () =>
    import('frontend/screens/DownloadManager/components/DownloadManagerItem')
)

export default function DownloadManager(): JSX.Element | null {
  const { t } = useTranslation()
  const [refreshing, setRefreshing] = useState(false)
  const [queueElements, setQueueElements] = useState<DMQueueElement[]>([])

  useEffect(() => {
    setRefreshing(true)
    window.api.getDMQueueInformation().then((elements: DMQueueElement[]) => {
      setQueueElements(elements)
      setRefreshing(false)
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e: Electron.IpcRendererEvent, elements: DMQueueElement[]) => {
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
        <>
          <span className="areaChart">
            <ProgressChart
              appName={queueElements.at(0)?.params.appName ?? ''}
            />
          </span>
          <div className="downloadManager">
            <div
              style={
                !queueElements.length ? { backgroundColor: 'transparent' } : {}
              }
              className="downloadList"
            >
              <div className="gameListHeader">
                <span>{t('download.manager.queue.element', 'Name')}</span>
                <span>{t('download.manager.queue.state', 'State')}</span>
                <span>{t('download.manager.queue.actions', 'Action')}</span>
              </div>
              {!!queueElements.length &&
                queueElements.map((element, key) => {
                  return <DownloadManagerItem key={key} {...element.params} />
                })}
            </div>
          </div>
        </>
      ) : (
        <h3>{t('download.manager.empty', 'Nothing to download.')}</h3>
      )}
    </>
  )
}
