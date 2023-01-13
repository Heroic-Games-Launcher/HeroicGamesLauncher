import React, { useEffect, useRef, useState } from 'react'

import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.scss'
import HeroicVersion from './components/HeroicVersion'
import { DMQueueElement } from 'common/types'

let mouseDragX = 0
let dragging = false
let sidebarSize = localStorage.getItem('sidebar-width') || 240
const minWidth = 60
const maxWidth = 400
const collapsedWidth = 120

export default React.memo(function Sidebar() {
  const sidebarEl = useRef<HTMLDivElement | null>(null)
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
    if (!sidebarEl.current) return

    if (sidebarSize < collapsedWidth) {
      sidebarEl.current.classList.add('collapsed')
    } else {
      sidebarEl.current.classList.remove('collapsed')
    }

    sidebarEl.current.style.setProperty('--sidebar-width', `${sidebarSize}px`)
  }, [sidebarEl])

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.clientX !== 0) {
      mouseDragX = e.clientX
    }
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    mouseDragX = e.clientX
    dragging = true

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

  const handleDragEnd = () => {
    dragging = false
    localStorage.setItem('sidebar-width', sidebarSize.toString())
  }

  return (
    <aside ref={sidebarEl} className="Sidebar">
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
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      />
    </aside>
  )
})
