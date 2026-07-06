// Preload script injected into store webviews (Epic, GOG, Amazon, Zoom).
// Runs in the guest WebContents. The host parses gamepad input and forwards
// high-level commands here via `webview.send('heroic-webview', cmd)` (see
// `src/frontend/helpers/gamepad.ts` → `handleWebviewAction`). This file only
// knows how to act on those commands against the guest DOM — it never polls
// gamepads or duplicates parsing logic from the frontend.
//
// Built by electron-vite into `build/preload/webviewPreload.js`; see
// `electron.vite.config.ts` and `src/backend/constants/paths.ts`.

// eslint-disable-next-line no-restricted-imports
import { ipcRenderer } from 'electron'

type Direction = 'up' | 'down' | 'left' | 'right'

type WebviewCommand =
  | { type: 'navigate'; direction: Direction }
  | { type: 'scroll'; direction: 'up' | 'down' }
  | { type: 'click' }
  | { type: 'goBack' }
  | { type: 'goForward' }
  | { type: 'focusSearch' }

// --- Mouse back/forward buttons ---
// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
document.addEventListener('mouseup', (ev) => {
  switch (ev.button) {
    case 3:
      if (history.length > 1) {
        history.back()
        ev.preventDefault()
      }
      break
    case 4:
      history.forward()
      ev.preventDefault()
      break
  }
})

// --- Focus ring so the user can see what's selected ---
// Stores often hide :focus outlines; we force a visible one.
function injectFocusRing() {
  const style = document.createElement('style')
  style.setAttribute('data-heroic-focus', '')
  style.textContent =
    ':focus, :focus-visible { outline: 3px solid #ffae00 !important; outline-offset: 2px !important; }'
  document.documentElement.appendChild(style)
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFocusRing, { once: true })
} else {
  injectFocusRing()
}

// --- Spatial navigation helpers ---

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]),' +
  ' select:not([disabled]), textarea:not([disabled]),' +
  ' [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'

function isVisible(el: HTMLElement): boolean {
  if (!el.offsetParent && el.tagName !== 'BODY') {
    const style = window.getComputedStyle(el)
    if (style.position !== 'fixed') return false
  }
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return false
  // include elements just off-screen so navigation can pull them in
  const vh = window.innerHeight
  const vw = window.innerWidth
  return (
    r.bottom > -200 && r.top < vh + 200 && r.right > -200 && r.left < vw + 200
  )
}

function getFocusables(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(isVisible)
}

function pickInitialFocus(): HTMLElement | null {
  const list = getFocusables()
  if (!list.length) return null
  list.sort((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return ra.top - rb.top || ra.left - rb.left
  })
  return list[0]
}

function navigate(direction: Direction): boolean {
  const current =
    document.activeElement && document.activeElement !== document.body
      ? (document.activeElement as HTMLElement)
      : pickInitialFocus()
  if (!current) return false

  const curRect = current.getBoundingClientRect()
  const cx = curRect.left + curRect.width / 2
  const cy = curRect.top + curRect.height / 2

  let best: HTMLElement | null = null
  let bestScore = Infinity

  for (const cand of getFocusables()) {
    if (cand === current) continue
    const r = cand.getBoundingClientRect()
    const dx = r.left + r.width / 2 - cx
    const dy = r.top + r.height / 2 - cy

    let inCone = false
    let perp = 0
    switch (direction) {
      case 'right':
        inCone = dx > 8 && Math.abs(dy) <= Math.abs(dx) * 1.5
        perp = Math.abs(dy)
        break
      case 'left':
        inCone = dx < -8 && Math.abs(dy) <= Math.abs(dx) * 1.5
        perp = Math.abs(dy)
        break
      case 'down':
        inCone = dy > 8 && Math.abs(dx) <= Math.abs(dy) * 1.5
        perp = Math.abs(dx)
        break
      case 'up':
        inCone = dy < -8 && Math.abs(dx) <= Math.abs(dy) * 1.5
        perp = Math.abs(dx)
        break
    }
    if (!inCone) continue

    const score = Math.hypot(dx, dy) + perp * 2
    if (score < bestScore) {
      bestScore = score
      best = cand
    }
  }

  if (best) {
    best.focus({ preventScroll: false })
    best.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth'
    })
    return true
  }

  // No candidate in the desired direction — fall back to scrolling.
  if (direction === 'down' || direction === 'up') {
    window.scrollBy({
      top: direction === 'down' ? 400 : -400,
      behavior: 'smooth'
    })
    return true
  }
  return false
}

function focusFirstSearchInput(): boolean {
  const candidates = document.querySelectorAll<HTMLElement>(
    'input[type="search"], input[type="text"], input[role="searchbox"], [role="search"] input'
  )
  for (const el of candidates) {
    if (isVisible(el)) {
      el.focus()
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      return true
    }
  }
  return false
}

// --- Command dispatch ---

function handleCommand(cmd: WebviewCommand) {
  switch (cmd.type) {
    case 'click': {
      const el = document.activeElement as HTMLElement | null
      if (el && el !== document.body && typeof el.click === 'function')
        el.click()
      break
    }
    case 'goBack':
      if (history.length > 1) history.back()
      break
    case 'goForward':
      history.forward()
      break
    case 'focusSearch':
      focusFirstSearchInput()
      break
    case 'navigate':
      navigate(cmd.direction)
      break
    case 'scroll':
      window.scrollBy({ top: cmd.direction === 'down' ? 60 : -60 })
      break
  }
}

ipcRenderer.on('heroic-webview', (_e, cmd: WebviewCommand) => {
  if (cmd && typeof cmd === 'object' && typeof cmd.type === 'string') {
    handleCommand(cmd)
  }
})
