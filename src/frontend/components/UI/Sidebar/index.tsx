import classNames from 'classnames'
import React, { useContext, useEffect, useRef, useState } from 'react'
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

const SIDEBAR_WIDTH = localStorage.getItem('sidebar-width') || 240

export default React.memo(function Sidebar() {
  const { t } = useTranslation()
  const sidebarEl = useRef(null)
  const { sidebarCollapsed, setSideBarCollapsed } = useContext(ContextProvider)
  const [currentDMElement, setCurrentDMElement] = useState<DMQueueElement>()

  useEffect(() => {
    window.api.getDMQueueInformation().then(({ elements }) => {
      setCurrentDMElement(elements[0])
    })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e, elements) => {
        setCurrentDMElement(elements[0])
      }
    )

    return () => {
      removeHandleDMQueueInformation()
    }
  }, [])

  useEffect(() => {
    const app = document.querySelector('.App') as HTMLElement

    const currentSize = Number(
      getComputedStyle(app)
        .getPropertyValue('--sidebar-width')
        .replace('px', '')
    )
    if (currentSize < 100) {
      setSideBarCollapsed(true)
    } else {
      setSideBarCollapsed(false)
    }
    app.style.setProperty('--sidebar-width', `${SIDEBAR_WIDTH}px`)
  }, [])

  useEffect(() => {
    // add event listener to check if the --sidebar-width changed and store it in localStorage
    const app = document.querySelector('.App') as HTMLElement
    app.addEventListener('transitionend', () => {
      const currentSize = Number(
        getComputedStyle(app)
          .getPropertyValue('--sidebar-width')
          .replace('px', '')
      )
      localStorage.setItem('sidebar-width', currentSize.toString())
    })

    return () => {
      app.removeEventListener('transitionend', () => {
        console.log('removed event listener')
      })
    }
  }, [])

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    const app = document.querySelector('.App') as HTMLElement

    if (e.clientX < 10) {
      return
    }

    if (e.clientX < 60) {
      app.style.setProperty('--sidebar-width', `60px`)
    } else if (e.clientX > 350) {
      app.style.setProperty('--sidebar-width', `350px`)
    } else {
      app.style.setProperty('--sidebar-width', `${e.clientX}px`)
    }
  }

  const handleDragEnd = () => {
    const app = document.querySelector('.App') as HTMLElement

    const finalSize = Number(
      getComputedStyle(app)
        .getPropertyValue('--sidebar-width')
        .replace('px', '')
    )

    if (finalSize < 120) {
      setSideBarCollapsed(true)
    } else {
      setSideBarCollapsed(false)
    }
  }

  return (
    <aside
      ref={sidebarEl}
      className={classNames('Sidebar', { collapsed: sidebarCollapsed })}
    >
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
      <div
        className="resizer"
        draggable
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      ></div>
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
