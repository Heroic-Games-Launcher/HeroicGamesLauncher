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
  const [plannendElements, setPlannendElements] = useState<DMQueueElement[]>([])
  const [currentElement, setCurrentElement] = useState<DMQueueElement>()

  useEffect(() => {
    setRefreshing(true)
    window.api.getDMQueueInformation().then((elements: DMQueueElement[]) => {
      setCurrentElement(elements.at(0))
      setPlannendElements([...elements.slice(1)])
      setRefreshing(false)
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e: Electron.IpcRendererEvent, elements: DMQueueElement[]) => {
        setCurrentElement(elements.at(0))
        setPlannendElements([...elements.slice(1)])
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
      {currentElement ? (
        <>
          <ProgressHeader appName={currentElement?.params.appName ?? ''} />
          <div className="downloadManager">
            <div
              style={!currentElement ? { backgroundColor: 'transparent' } : {}}
              className="downloadList"
            >
              <h3 className="downloadManagerCurrentSectionTitle">Current</h3>
              <div className="gameListHeader">
                <span>{t('download.manager.queue.element', 'Name')}</span>
                <span>{t('download.manager.queue.actions', 'Action')}</span>
              </div>
              <DownloadManagerItem
                params={currentElement.params}
                current={true}
              />
              {!!plannendElements.length && (
                <>
                  <h3 className="downloadManagerQueuedSectionTitle">Queued</h3>
                  <div className="gameListHeader">
                    <span>{t('download.manager.queue.element', 'Name')}</span>
                    <span>{t('download.manager.queue.actions', 'Action')}</span>
                  </div>
                  {plannendElements.map((element, key) => {
                    return (
                      <DownloadManagerItem
                        key={key}
                        params={element.params}
                        current={false}
                      />
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <h3>{t('download.manager.empty', 'Nothing to download.')}</h3>
      )}
    </>
  )
}
