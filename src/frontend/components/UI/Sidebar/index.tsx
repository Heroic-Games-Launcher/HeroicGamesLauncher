import React, { useEffect, useRef, useState } from 'react'

import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.scss'
import HeroicVersion from './components/HeroicVersion'
import SidebarTour from './components/SidebarTour'
import { DMQueueElement, DownloadManagerState } from 'common/types'

import HeroicIcon from 'frontend/assets/heroic-icon.svg?react'
import { useNavigate } from 'react-router-dom'
import { WebviewTag } from 'electron'

const defaultWidth = 240
const minWidth = 60
const maxWidth = 400
const collapsedWidth = 120

const storedWidth = () =>
  Number(localStorage.getItem('sidebar-width')) || defaultWidth

export default React.memo(function Sidebar() {
  const sidebarEl = useRef<HTMLDivElement | null>(null)
  const sidebarSize = useRef(defaultWidth)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentDMElement, setCurrentDMElement] = useState<DMQueueElement>()
  const [dmState, setDmState] = useState<DownloadManagerState>('idle')

  const navigate = useNavigate()

  useEffect(() => {
    window.api
      .getDMQueueInformation()
      .then(({ elements, state }) => {
        setCurrentDMElement(elements[0])
        setDmState(state)
      })
      .catch((error) => {
        console.error('Failed to get DM queue information:', error)
      })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e, elements, state) => {
        setCurrentDMElement(elements[0])
        setDmState(state)
      }
    )

    return () => {
      removeHandleDMQueueInformation()
    }
  }, [])

  useEffect(() => {
    if (!sidebarEl.current) return

    sidebarSize.current = storedWidth()

    setIsCollapsed(sidebarSize.current < collapsedWidth)
    sidebarEl.current.classList.toggle(
      'collapsed',
      sidebarSize.current < collapsedWidth
    )
    sidebarEl.current.style.setProperty(
      '--sidebar-width',
      `${sidebarSize.current}px`
    )
  }, [sidebarEl])

  useEffect(() => {
    window.api.handleGoToScreen((e, screen) => {
      // handle navigate to screen
      navigate(screen, { state: { fromGameCard: false } })
    })
  }, [])

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    const isRTL = document.getElementById('app')?.classList.contains('isRTL')
    const viewportWidth = window.innerWidth

    let mouseDragX = e.clientX
    if (isRTL) {
      mouseDragX = viewportWidth - mouseDragX
    }
    let dragging = true

    const onMouseMove = (e: MouseEvent) => {
      if (e.clientX !== 0) {
        mouseDragX = e.clientX
        if (isRTL) {
          mouseDragX = viewportWidth - e.clientX
        }
      }
    }

    const finishDrag = () => {
      document.body.removeEventListener('mousemove', onMouseMove)
      document.body.removeEventListener('mouseup', finishDrag)
      document.body.removeEventListener('mouseleave', finishDrag)
      dragging = false
      localStorage.setItem('sidebar-width', sidebarSize.current.toString())

      // Re-enable pointer events on webview element
      const webviewEl = document.querySelector<WebviewTag>('webview')
      if (webviewEl) {
        webviewEl.style.pointerEvents = 'auto'
      }
    }

    document.body.addEventListener('mouseup', finishDrag)
    document.body.addEventListener('mouseleave', finishDrag)
    document.body.addEventListener('mousemove', onMouseMove)

    // Disable pointer events on webview element
    const webviewEl = document.querySelector<WebviewTag>('webview')
    if (webviewEl) {
      webviewEl.style.pointerEvents = 'none'
    }

    const dragFrame = () => {
      if (!sidebarEl.current) return

      let newWidth = mouseDragX
      if (newWidth < minWidth) {
        newWidth = minWidth
      } else if (newWidth > maxWidth) {
        newWidth = maxWidth
      }

      if (sidebarSize.current !== newWidth) {
        const wasCollapsed = sidebarSize.current < collapsedWidth
        sidebarSize.current = newWidth
        const collapsed = newWidth < collapsedWidth

        if (wasCollapsed !== collapsed) setIsCollapsed(collapsed)
        sidebarEl.current.classList.toggle('collapsed', collapsed)
        sidebarEl.current.style.setProperty('--sidebar-width', `${newWidth}px`)
      }

      if (dragging) {
        requestAnimationFrame(dragFrame)
      }
    }

    requestAnimationFrame(dragFrame)
  }

  return (
    <aside ref={sidebarEl} className="Sidebar">
      <div className="Sidebar__brand" data-tour="sidebar-brand">
        <HeroicIcon className="heroicIcon" />
      </div>
      <SidebarLinks />
      <div className="currentDownloads" data-tour="sidebar-current-download">
        {currentDMElement && (
          <CurrentDownload
            key={currentDMElement.params.appName}
            appName={currentDMElement.params.appName}
            runner={currentDMElement.params.runner}
            state={dmState}
          />
        )}
      </div>
      <HeroicVersion />
      <div className="resizer" onMouseDown={handleDragStart} />
      <SidebarTour
        hasCurrentDownload={Boolean(currentDMElement)}
        isCollapsed={isCollapsed}
      />
    </aside>
  )
})
