import { useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'

import { BTN_ACTION, BTN_BACK } from '../../controller'
import { useGamepadButtonPress } from '../../hooks'

type ButtonId = 'confirm' | 'cancel' | 'dismiss'

type ConfirmDialogProps = {
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
  // When provided a third "dismiss" button is rendered and Esc/B routes
  // here instead of onCancel — useful when the cancel button itself
  // performs an action (e.g. "Launch without update") and the user needs
  // a way to back out without committing to either choice.
  dismissLabel?: string
  onDismiss?: () => void
}

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
  actionButtonLabel,
  dismissLabel,
  onDismiss
}: ConfirmDialogProps) {
  const buttons = useMemo<ButtonId[]>(
    () =>
      dismissLabel && onDismiss
        ? ['confirm', 'cancel', 'dismiss']
        : ['confirm', 'cancel'],
    [dismissLabel, onDismiss]
  )
  const [focused, setFocused] = useState<ButtonId>('confirm')
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dismissRef = useRef<HTMLButtonElement>(null)
  const refs = { confirm: confirmRef, cancel: cancelRef, dismiss: dismissRef }

  const handlers: Record<ButtonId, () => void> = {
    confirm: onConfirm,
    cancel: onCancel,
    dismiss: onDismiss ?? onCancel
  }

  const onBackKey = onDismiss ?? onCancel

  useEffect(() => {
    // Read by gamepad.ts to block the global `back` action from navigating
    // away from /console while this modal is open.
    document.body.classList.add('console-ignore-back')
    return () => document.body.classList.remove('console-ignore-back')
  }, [])

  useEffect(() => {
    refs[focused].current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        const delta = e.key === 'ArrowRight' ? 1 : -1
        setFocused((f) => {
          const idx = buttons.indexOf(f)
          return buttons[(idx + delta + buttons.length) % buttons.length]
        })
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        handlers[focused]()
        return
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        onBackKey()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, buttons, onBackKey, onConfirm, onCancel, onDismiss])

  useGamepadButtonPress(BTN_ACTION, () => handlers[focused]())
  useGamepadButtonPress(BTN_BACK, () => onBackKey())

  const confirmKey = gamepadConnected ? actionButtonLabel : 'Enter'
  const dismissKey = gamepadConnected ? backButtonLabel : 'Esc'

  const renderButton = (id: ButtonId, label: string, kbdHint?: string) => (
    <button
      key={id}
      ref={refs[id]}
      className={classNames('consoleChip', { active: focused === id })}
      onClick={handlers[id]}
      onMouseEnter={() => setFocused(id)}
      onFocus={() => setFocused(id)}
    >
      {kbdHint && <kbd>{kbdHint}</kbd>} {label}
    </button>
  )

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
        {renderButton('confirm', confirmLabel, confirmKey)}
        {renderButton(
          'cancel',
          cancelLabel,
          dismissLabel && onDismiss ? undefined : dismissKey
        )}
        {dismissLabel &&
          onDismiss &&
          renderButton('dismiss', dismissLabel, dismissKey)}
      </div>
    </div>
  )
}
