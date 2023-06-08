import React, { useEffect, useRef, useState } from 'react'

import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.scss'
import HeroicVersion from './components/HeroicVersion'
import { DMQueueElement } from 'common/types'

import { ReactComponent as HeroicIcon } from 'frontend/assets/heroic-icon.svg'
import { useNavigate } from 'react-router-dom'

let sidebarSize = localStorage.getItem('sidebar-width') || 240
const minWidth = 60
const maxWidth = 400
const collapsedWidth = 120

export default React.memo(function Sidebar() {
  const sidebarEl = useRef<HTMLDivElement | null>(null)
  const [currentDMElement, setCurrentDMElement] = useState<DMQueueElement>()

  const navigate = useNavigate()

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
    if (!sidebarEl.current) return

    if (Number(sidebarSize) < collapsedWidth) {
      sidebarEl.current.classList.add('collapsed')
    } else {
      sidebarEl.current.classList.remove('collapsed')
    }

    sidebarEl.current.style.setProperty('--sidebar-width', `${sidebarSize}px`)
  }, [sidebarEl])

  useEffect(() => {
    window.api.handleGoToScreen((e: Event, screen: string) => {
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
      localStorage.setItem('sidebar-width', sidebarSize.toString())

      // Re-enable pointer events on webview element
      const webviewEl = document.querySelector(
        'webview'
      ) as HTMLDivElement | null
      if (webviewEl) {
        webviewEl.style.pointerEvents = 'auto'
      }
    }

    document.body.addEventListener('mouseup', finishDrag)
    document.body.addEventListener('mouseleave', finishDrag)
    document.body.addEventListener('mousemove', onMouseMove)

    // Disable pointer events on webview element
    const webviewEl = document.querySelector('webview') as HTMLDivElement | null
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

      if (sidebarSize !== newWidth) {
        sidebarSize = newWidth

        if (sidebarSize < collapsedWidth) {
          sidebarEl.current.classList.add('collapsed')
        } else {
          sidebarEl.current.classList.remove('collapsed')
        }

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
      <HeroicIcon className="heroicIcon" />
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
      <div className="resizer" onMouseDown={handleDragStart} />
    </aside>
  )
})
