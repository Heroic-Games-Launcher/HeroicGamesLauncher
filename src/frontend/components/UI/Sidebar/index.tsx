import React, { useEffect, useRef } from 'react'

import MainLinks from './components/MainLinks'
import ExtraLinks from './components/ExtraLinks'
import './index.scss'
import HeroicVersion from './components/HeroicVersion'

import HeroicIcon from 'frontend/assets/heroic-icon.svg?react'
import { useNavigate } from 'react-router-dom'
import { WebviewTag } from 'electron'

let sidebarSize = localStorage.getItem('sidebar-width') || 250
const minWidth = 60
const maxWidth = 400
const collapsedWidth = 175

export default React.memo(function Sidebar() {
  const sidebarEl = useRef<HTMLDivElement | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    if (!sidebarEl.current) return

    if (Number(sidebarSize) < collapsedWidth) {
      sidebarEl.current.classList.add('collapsed')
    } else {
      sidebarEl.current.classList.remove('collapsed')
    }

    sidebarEl.current.style.setProperty('--scroll-offset', '0px')
    sidebarEl.current.style.setProperty('--sidebar-width', `${sidebarSize}px`)
  }, [sidebarEl])

  useEffect(() => {
    window.api.handleGoToScreen((e, screen) => {
      // handle navigate to screen
      navigate(screen, { state: { fromGameCard: false } })
    })
  }, [])

  const handleScroll = () => {
    if (!sidebarEl.current) return

    sidebarEl.current.style.setProperty(
      '--scroll-offset',
      `${sidebarEl.current.scrollTop}px`
    )
  }

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
    <aside ref={sidebarEl} className="Sidebar" onScroll={handleScroll}>
      <HeroicIcon className="heroicIcon" />
      <MainLinks />
      <div className="filler" />
      <ExtraLinks />
      <div className="divider" />
      <HeroicVersion />
      <div className="resizer" onMouseDown={handleDragStart} />
    </aside>
  )
})
