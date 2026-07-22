// Preload script injected into store webviews (Epic, GOG, Amazon, Zoom).
// Runs in the guest WebContents. The host parses gamepad input and forwards
// high-level commands here via `webview.send('heroic-webview', cmd)` (see
// `src/frontend/helpers/gamepad.ts` → `handleWebviewAction`). This file only
// knows how to act on those commands against the guest DOM — it never polls
// gamepads or duplicates parsing logic from the frontend.
//
// IMPORTANT: we must NOT move real DOM focus into the guest. Chromium only
// delivers Gamepad API input to the *focused* document, so focusing the guest
// would blur the host and kill the host's gamepad polling — the input loop
// that feeds us these commands. Instead we track our own "virtual cursor"
// element and highlight it manually, leaving real focus in the host.
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
  | { type: 'enter' }
  | { type: 'exit' }

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

// --- Virtual cursor ---
// A custom highlight decoupled from native focus (see file header). Stores hide
// :focus outlines anyway, so a forced attribute-based ring is more reliable.

const CURSOR_ATTR = 'data-heroic-cursor'

let cursorEl: HTMLElement | null = null

function injectCursorStyle() {
  const style = document.createElement('style')
  style.setAttribute('data-heroic-cursor-style', '')
  style.textContent = `[${CURSOR_ATTR}] { outline: 3px solid #ffae00 !important; outline-offset: 2px !important; }`
  document.documentElement.appendChild(style)
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectCursorStyle, {
    once: true
  })
} else {
  injectCursorStyle()
}

function clearCursor() {
  if (cursorEl) cursorEl.removeAttribute(CURSOR_ATTR)
  cursorEl = null
}

function setCursor(el: HTMLElement | null) {
  if (cursorEl && cursorEl !== el) cursorEl.removeAttribute(CURSOR_ATTR)
  cursorEl = el
  if (el) {
    el.setAttribute(CURSOR_ATTR, '')
    el.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth'
    })
  }
}

// The cursor element, but only if it's still in the DOM and visible. Store
// pages swap content out from under us, so we can't trust a stale reference.
function currentCursor(): HTMLElement | null {
  if (cursorEl && cursorEl.isConnected && isVisible(cursorEl)) return cursorEl
  return null
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
  const current = currentCursor() ?? pickInitialFocus()
  if (!current) return false

  // No cursor yet (first move after entering) — just show it where we are.
  if (current !== cursorEl) {
    setCursor(current)
    return true
  }

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
    setCursor(best)
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

function activateCursor() {
  const el = currentCursor()
  if (!el) return
  // Text fields need real focus so the user can type; everything else is
  // driven by a synthetic click, which works without the frame being focused.
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) {
    el.focus()
  } else if (typeof el.click === 'function') {
    el.click()
  }
}

function focusFirstSearchInput(): boolean {
  const candidates = document.querySelectorAll<HTMLElement>(
    'input[type="search"], input[type="text"], input[role="searchbox"], [role="search"] input'
  )
  for (const el of candidates) {
    if (isVisible(el)) {
      setCursor(el)
      el.focus()
      return true
    }
  }
  return false
}

// --- Command dispatch ---

function handleCommand(cmd: WebviewCommand) {
  switch (cmd.type) {
    case 'enter':
      // Arm the cursor when the host hands control to us.
      setCursor(currentCursor() ?? pickInitialFocus())
      break
    case 'exit':
      clearCursor()
      break
    case 'click':
      activateCursor()
      break
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
