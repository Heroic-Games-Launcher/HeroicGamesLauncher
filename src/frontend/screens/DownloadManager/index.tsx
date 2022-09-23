import './index.css'

import React, { lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DMQueueElement } from 'common/types'
import { UpdateComponent } from 'frontend/components/UI'
import ProgressHeader from './components/ProgressHeader'

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
          <ProgressHeader appName={queueElements.at(0)?.params.appName ?? ''} />
          <div className="downloadManager">
            <div
              style={
                !queueElements.length ? { backgroundColor: 'transparent' } : {}
              }
              className="downloadList"
            >
              <h3>Current</h3>
              <div className="gameListHeader">
                <span>{t('download.manager.queue.element', 'Name')}</span>
                <span>{t('download.manager.queue.actions', 'Action')}</span>
              </div>
              <DownloadManagerItem
                appName={queueElements.at(0)?.params.appName ?? ''}
                path={queueElements.at(0)?.params.path ?? ''}
                installDlcs={queueElements.at(0)?.params.installDlcs}
                sdlList={queueElements.at(0)?.params.sdlList ?? []}
                platformToInstall={
                  queueElements.at(0)?.params.platformToInstall ?? 'Windows'
                }
                runner={queueElements.at(0)?.params.runner ?? 'legendary'}
              />
              <h3>Plannend</h3>
              <div className="gameListHeader">
                <span>{t('download.manager.queue.element', 'Name')}</span>
                <span>{t('download.manager.queue.actions', 'Action')}</span>
              </div>
              {!!queueElements.length &&
                queueElements.map((element, key) => {
                  if (key !== 0) {
                    return <DownloadManagerItem key={key} {...element.params} />
                  }
                  return null
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
