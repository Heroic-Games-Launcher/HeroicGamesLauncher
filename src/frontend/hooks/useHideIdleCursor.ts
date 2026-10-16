import { useEffect, useState } from 'react'

const IDLE_TIMEOUT_MS = 3000

/**
 * Hides the mouse cursor while `enabled` is true, until the mouse is actually
 * moved, by setting the `hideCursor` class on the root element (see App.css). After it has been idle for a few seconds it is hidden again.
 *
 * Chromium sends fake `mousemove` events when content scrolls under a stationary
 * cursor (e.g. when navigating with a controller), so only a changed pointer
 * position counts as movement.
 *
 * @returns Whether the cursor should currently be hidden
 */
export function useHideIdleCursor(enabled: boolean): boolean {
  const [hidden, setHidden] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setHidden(false)
      return
    }
    setHidden(true)

    let lastX: number | null = null
    let lastY: number | null = null
    let timeout: ReturnType<typeof setTimeout> | undefined

    const onMouseMove = (e: MouseEvent) => {
      const moved =
        lastX !== null && (e.screenX !== lastX || e.screenY !== lastY)
      lastX = e.screenX
      lastY = e.screenY
      if (!moved) return

      setHidden(false)
      clearTimeout(timeout)
      timeout = setTimeout(() => setHidden(true), IDLE_TIMEOUT_MS)
    }

    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      clearTimeout(timeout)
    }
  }, [enabled])

  const hideCursor = enabled && hidden
  useEffect(() => {
    document.documentElement.classList.toggle('hideCursor', hideCursor)
    return () => document.documentElement.classList.remove('hideCursor')
  }, [hideCursor])

  return hideCursor
}
