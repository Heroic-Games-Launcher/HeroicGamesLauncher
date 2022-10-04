import './index.css'

import React, { lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DMQueueElement, InstallParams } from 'common/types'
import { UpdateComponent } from 'frontend/components/UI'
import ProgressHeader from './components/ProgressHeader'
import DownloadManagerHeader from './DownloadManagerHeader'

const DownloadManagerItem = lazy(
  async () =>
    import('frontend/screens/DownloadManager/components/DownloadManagerItem')
)

type DMQueue = {
  elements: DMQueueElement[]
  finished: InstallParams[]
}

export default function DownloadManager(): JSX.Element | null {
  const { t } = useTranslation()
  const [refreshing, setRefreshing] = useState(false)
  const [plannendElements, setPlannendElements] = useState<DMQueueElement[]>([])
  const [currentElement, setCurrentElement] = useState<DMQueueElement>()
  const [finishedElem, setFinishedElem] = useState<InstallParams[]>()

  useEffect(() => {
    setRefreshing(true)
    window.api.getDMQueueInformation().then(({ elements }: DMQueue) => {
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

  useEffect(() => {
    window.api.getDMQueueInformation().then(({ finished }: DMQueue) => {
      setFinishedElem(finished)
    })
  }, [plannendElements.length, currentElement?.params.appName])

  if (refreshing) {
    return <UpdateComponent />
  }

  const hasItems = currentElement || finishedElem?.length

  return (
    <>
      <h2>{t('download.manager.title', 'Download Manager (Beta)')}</h2>
      {!hasItems && (
        <h3>{t('download.manager.empty', 'Nothing to download.')}</h3>
      )}
      {currentElement && (
        <>
          <ProgressHeader appName={currentElement?.params.appName ?? ''} />
          <div className="downloadManager">
            <div
              style={!currentElement ? { backgroundColor: 'transparent' } : {}}
              className="downloadList"
            >
              <h3 className="downloadManagerCurrentSectionTitle">
                {t('queue.label.downloading', 'Downloading')}
              </h3>
              <DownloadManagerHeader />
              <DownloadManagerItem
                params={currentElement.params}
                current={true}
              />
              {!!plannendElements.length && (
                <>
                  <h3 className="downloadManagerQueuedSectionTitle">
                    {t('queue.label.queued', 'Queued')}
                  </h3>
                  <DownloadManagerHeader />
                  {plannendElements.map((element, key) => (
                    <DownloadManagerItem
                      key={key}
                      params={element.params}
                      current={false}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
      {!!finishedElem?.length && (
        <div className="downloadManager">
          <div className="downloadList">
            <h3 className="downloadManagerQueuedSectionTitle">
              {t('queue.label.finished', 'Completed')}
            </h3>
            <DownloadManagerHeader />
            {finishedElem.map((el, key) => (
              <DownloadManagerItem
                key={key}
                params={el}
                current={false}
                finished
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
