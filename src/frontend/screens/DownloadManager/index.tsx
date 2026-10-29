import './index.css'

import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { CircleCheck, Download, Inbox, ListOrdered, Trash2 } from 'lucide-react'
import { DMQueueElement, DownloadManagerState } from 'common/types'
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  PageHeader,
  Panel,
  SettingsCard,
  UpdateComponent
} from 'frontend/components/UI'
import ProgressHeader from './components/ProgressHeader'
import DownloadManagerHeader from './DownloadManagerHeader'
import { downloadManagerStore } from 'frontend/helpers/electronStores'
import { DMQueue } from 'frontend/types'
import DownloadManagerItem from './components/DownloadManagerItem'
import { hasHelp } from 'frontend/hooks/hasHelp'

export default React.memo(function DownloadManager(): JSX.Element | null {
  const { t } = useTranslation()
  const [refreshing, setRefreshing] = useState(false)
  const [state, setState] = useState<DownloadManagerState>('idle')
  const [plannendElements, setPlannendElements] = useState<DMQueueElement[]>([])
  const [currentElement, setCurrentElement] = useState<DMQueueElement>()
  const [finishedElem, setFinishedElem] = useState<DMQueueElement[]>()

  hasHelp(
    'downloadManager',
    t('help.title.downloadManager', 'Download Manager'),
    <p>
      {t('help.content.downloadManager', 'Shows current and past downloads.')}
    </p>
  )

  useEffect(() => {
    setRefreshing(true)
    window.api.getDMQueueInformation().then(({ elements, state }: DMQueue) => {
      setCurrentElement(elements[0])
      setPlannendElements([...elements.slice(1)])
      setRefreshing(false)
      setState(state)
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (
        e: Electron.IpcRendererEvent,
        elements: DMQueueElement[],
        state: DownloadManagerState
      ) => {
        if (elements) {
          setCurrentElement(elements[0])
          setPlannendElements([...elements.slice(1)])
          setState(state)
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

  const handleClearItem = (appName: string) => {
    const filteredFinishedElem = finishedElem?.filter(
      (e) => e.params.appName !== appName
    )
    setFinishedElem(filteredFinishedElem)
    downloadManagerStore.set(
      'finished',
      filteredFinishedElem ? filteredFinishedElem : []
    )
  }

  const doneElements =
    (finishedElem?.length &&
      finishedElem.sort((a, b) => {
        // Sort by endTime
        return b.endTime - a.endTime
      })) ||
    []

  return (
    <div className="DownloadManager">
      <div className="DownloadManager__wrapper">
        <PageHeader
          title={t('download-manager.title', 'Downloads')}
          description={t(
            'download-manager.pageSubtitle',
            'What is installing now, what comes next and what is already done'
          )}
        />

        <Panel
          tone="glass"
          padding="lg"
          className={classNames('DownloadManager__current', {
            'DownloadManager__current--idle': !currentElement
          })}
        >
          {currentElement ? (
            <>
              <DownloadManagerItem
                element={currentElement}
                current={true}
                state={state}
                variant="hero"
              />
              <ProgressHeader
                state={state}
                appName={currentElement.params.appName}
                runner={currentElement.params.runner}
              />
            </>
          ) : (
            <EmptyState
              glyph={Download}
              title={t('queue.label.empty', 'Nothing to download')}
              description={t(
                'download-manager.empty.current',
                'Games you install or update show their progress here.'
              )}
            />
          )}
        </Panel>

        {/* with nothing downloading and nothing queued the hero already says
            the queue is empty, so the section would only repeat it */}
        {(currentElement || plannendElements.length > 0) && (
          <SettingsCard
            title={t('queue.label.queued', 'Queued')}
            glyph={ListOrdered}
            meta={<Badge>{plannendElements.length}</Badge>}
            className="DownloadManager__section"
          >
            {plannendElements.length > 0 ? (
              <div className="DownloadList">
                <DownloadManagerHeader time="queued" />
                {plannendElements.map((el, index) => (
                  <DownloadManagerItem
                    key={el.params.appName}
                    element={el}
                    current={false}
                    position={index + 1}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                glyph={Inbox}
                title={t(
                  'download-manager.empty.queue.title',
                  'Queue is empty'
                )}
                description={t(
                  'download-manager.empty.queue.description',
                  'Downloads you start while another one is running wait here.'
                )}
              />
            )}
          </SettingsCard>
        )}

        {!!doneElements.length && (
          <SettingsCard
            title={t('queue.label.finished', 'Completed')}
            glyph={CircleCheck}
            meta={<Badge>{doneElements.length}</Badge>}
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon glyph={Trash2} size="md" />}
                onClick={() => handleClearList()}
              >
                {t('queue.label.clear', 'Clear List')}
              </Button>
            }
            className="DownloadManager__section"
          >
            <div className="DownloadList">
              <DownloadManagerHeader time="finished" />
              {doneElements.map((el) => (
                <DownloadManagerItem
                  key={`${el.params.appName}-${el.endTime}`}
                  element={el}
                  current={false}
                  handleClearItem={handleClearItem}
                />
              ))}
            </div>
          </SettingsCard>
        )}
      </div>
    </div>
  )
})
