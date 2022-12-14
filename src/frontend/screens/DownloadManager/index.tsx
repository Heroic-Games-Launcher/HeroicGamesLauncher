import './index.css'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DMQueueElement } from 'common/types'
import { UpdateComponent } from 'frontend/components/UI'
import ProgressHeader from './components/ProgressHeader'
import DownloadManagerHeader from './DownloadManagerHeader'
import { downloadManagerStore } from 'frontend/helpers/electronStores'
import { DMQueue } from 'frontend/types'
import DownloadManagerItem from './components/DownloadManagerItem'

export default React.memo(function DownloadManager(): JSX.Element | null {
  const { t } = useTranslation()
  const [refreshing, setRefreshing] = useState(false)
  const [plannendElements, setPlannendElements] = useState<DMQueueElement[]>([])
  const [currentElement, setCurrentElement] = useState<DMQueueElement>()
  const [finishedElem, setFinishedElem] = useState<DMQueueElement[]>()

  useEffect(() => {
    setRefreshing(true)
    window.api.getDMQueueInformation().then(({ elements }: DMQueue) => {
      setCurrentElement(elements[0])
      setPlannendElements([...elements.slice(1)])
      setRefreshing(false)
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e: Electron.IpcRendererEvent, elements: DMQueueElement[]) => {
        if (elements) {
          setCurrentElement(elements[0])
          setPlannendElements([...elements.slice(1)])
        }
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

  const handleClearList = () => {
    setFinishedElem([])
    downloadManagerStore.set('finished', [])
  }

  const doneElements =
    (finishedElem?.length &&
      finishedElem.sort((a, b) => {
        // put failed at the end of the list
        const status = a.status || b.status
        if (!status) {
          return -1
        }
        if (status === 'error' || status === 'abort') {
          return 1
        }
        return -1
      })) ||
    []

  /*
    Other Keys:
    t('queue.label.empty', 'Nothing to download')
    t('download-manager.install-type.install', 'Install')
    t('download-manager.install-type.update', 'Update')
    */

  return (
    <>
      <h4
        style={{
          padding: 'var(--space-xl) var(--space-md) 0',
          textAlign: 'left'
        }}
      >
        {t('download-manager.title', 'Downloads')}
      </h4>
      {
        <>
          <ProgressHeader
            downloading={Boolean(currentElement)}
            appName={currentElement?.params?.appName ?? ''}
          />
          {currentElement && (
            <div className="downloadManager">
              <div
                style={
                  !currentElement ? { backgroundColor: 'transparent' } : {}
                }
                className="downloadList"
              >
                <h5 className="downloadManagerCurrentSectionTitle">
                  {t('queue.label.downloading', 'Downloading')}
                </h5>
                <div className="dmItemList">
                  <DownloadManagerHeader time="started" />
                  <DownloadManagerItem
                    element={currentElement}
                    current={true}
                  />
                </div>
              </div>
            </div>
          )}
          <h5 className="downloadManagerQueuedSectionTitle">
            {t('queue.label.queued', 'Queued')}
          </h5>
          <div className="dmItemList">
            <DownloadManagerHeader time="queued" />
            {plannendElements.length > 0 ? (
              plannendElements.map((el, key) => (
                <DownloadManagerItem key={key} element={el} current={false} />
              ))
            ) : (
              <DownloadManagerItem current={false} />
            )}
          </div>
        </>
      }
      {!!doneElements?.length && (
        <div className="downloadManager">
          <div className="downloadList">
            <span>
              <h5 className="downloadManagerQueuedSectionTitle">
                {t('queue.label.finished', 'Completed')}
                <button
                  className="button is-text"
                  onClick={() => handleClearList()}
                >
                  {t('queue.label.clear', 'Clear List')}
                </button>
              </h5>
            </span>
            <div className="dmItemList">
              <DownloadManagerHeader time="finished" />
              {doneElements.map((el, key) => (
                <DownloadManagerItem key={key} element={el} current={false} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
})
