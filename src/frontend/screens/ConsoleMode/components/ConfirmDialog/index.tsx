import { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'

import { BTN_ACTION, BTN_BACK } from '../../controller'
import { useGamepadButtonPress } from '../../hooks'

export default function ConfirmDialog({
  title,
  message,
  gameTitle,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  gamepadConnected,
  backButtonLabel,
  actionButtonLabel
}: {
  title: string
  message: string
  gameTitle: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  gamepadConnected: boolean
  backButtonLabel: string
  actionButtonLabel: string
}) {
  const [focused, setFocused] = useState<'confirm' | 'cancel'>('confirm')
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    // Read by gamepad.ts to block the global `back` action from navigating
    // away from /console while this modal is open.
    document.body.classList.add('console-modal-open')
    return () => document.body.classList.remove('console-modal-open')
  }, [])

  useEffect(() => {
    const btn = focused === 'confirm' ? confirmRef.current : cancelRef.current
    btn?.focus({ preventScroll: true })
  }, [focused])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        setFocused((f) => (f === 'confirm' ? 'cancel' : 'confirm'))
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        if (focused === 'confirm') onConfirm()
        else onCancel()
        return
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [focused, onConfirm, onCancel])

  useGamepadButtonPress(BTN_ACTION, () => {
    if (focused === 'confirm') onConfirm()
    else onCancel()
  })
  useGamepadButtonPress(BTN_BACK, onCancel)

  const confirmKey = gamepadConnected ? actionButtonLabel : 'Enter'
  const dismissKey = gamepadConnected ? backButtonLabel : 'Esc'

  return (
    <div
      className="consoleLaunchOverlay"
      role="alertdialog"
      aria-live="assertive"
    >
      <div className="consoleLaunchText">{title}</div>
      <div className="consoleLaunchGameTitle">{gameTitle}</div>
      <p className="consoleUpdateNoticeBody">{message}</p>
      <div className="consoleUpdateNoticeButtons">
        <button
          ref={confirmRef}
          className={classNames('consoleChip', {
            active: focused === 'confirm'
          })}
          onClick={onConfirm}
          onMouseEnter={() => setFocused('confirm')}
          onFocus={() => setFocused('confirm')}
        >
          <kbd>{confirmKey}</kbd> {confirmLabel}
        </button>
        <button
          ref={cancelRef}
          className={classNames('consoleChip', {
            active: focused === 'cancel'
          })}
          onClick={onCancel}
          onMouseEnter={() => setFocused('cancel')}
          onFocus={() => setFocused('cancel')}
        >
          <kbd>{dismissKey}</kbd> {cancelLabel}
        </button>
      </div>
    </div>
  )
}
