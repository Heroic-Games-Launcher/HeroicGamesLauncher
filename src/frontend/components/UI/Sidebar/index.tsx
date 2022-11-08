import classNames from 'classnames'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSquareCaretLeft,
  faSquareCaretRight
} from '@fortawesome/free-solid-svg-icons'
import ContextProvider from 'frontend/state/ContextProvider'
import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.css'
import HeroicVersion from './components/HeroicVersion'
import { DMQueueElement } from 'common/types'
import { DMQueue } from 'frontend/types'

export default React.memo(function Sidebar() {
  const { t } = useTranslation()
  const { sidebarCollapsed, setSideBarCollapsed } = useContext(ContextProvider)
  const [currentDMElement, setCurrentDMElement] = useState<DMQueueElement>()

  useEffect(() => {
    window.api.getDMQueueInformation().then(({ elements }: DMQueue) => {
      setCurrentDMElement(elements[0])
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e: Electron.IpcRendererEvent, elements: DMQueueElement[]) => {
        setCurrentDMElement(elements[0])
      }
    )

    return () => {
      removeHandleDMQueueInformation()
    }
  }, [])

  return (
    <aside className={classNames('Sidebar', { collapsed: sidebarCollapsed })}>
      <SidebarLinks />
      <div className="currentDownloads">
        {currentDMElement && (
          <CurrentDownload
            key={currentDMElement.params.appName}
            appName={currentDMElement.params.appName}
            runner={currentDMElement.params.runner}
          />
        )}
      </div>
      <HeroicVersion />
      <button
        className="collapseIcon"
        onClick={() => setSideBarCollapsed(!sidebarCollapsed)}
      >
        <FontAwesomeIcon
          icon={sidebarCollapsed ? faSquareCaretRight : faSquareCaretLeft}
          title={
            sidebarCollapsed
              ? t('sidebar.uncollapse', 'Uncollapse sidebar')
              : t('sidebar.collapse', 'Collapse sidebar')
          }
        />
      </button>
    </aside>
  )
})
