import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { BTN_ACTION, BTN_BACK } from '../../controller'
import { useGamepadButtonPress } from '../../hooks'

import type { GameInfo } from 'common/types'

export default function UpdateNotice({
  game,
  onUpdate,
  onLaunchWithoutUpdate,
  gamepadConnected,
  backButtonLabel,
  actionButtonLabel
}: {
  game: GameInfo
  onUpdate: () => void
  onLaunchWithoutUpdate: () => void
  gamepadConnected: boolean
  backButtonLabel: string
  actionButtonLabel: string
}) {
  const { t } = useTranslation('gamepage')
  const [focused, setFocused] = useState<'yes' | 'no'>('yes')
  const yesRef = useRef<HTMLButtonElement | null>(null)
  const noRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    // Read by gamepad.ts to block the global `back` action from navigating
    // away from /console while this modal is open.
    document.body.classList.add('console-modal-open')
    return () => document.body.classList.remove('console-modal-open')
  }, [])

  useEffect(() => {
    const btn = focused === 'yes' ? yesRef.current : noRef.current
    btn?.focus({ preventScroll: true })
  }, [focused])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
        setFocused((f) => (f === 'yes' ? 'no' : 'yes'))
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        if (focused === 'yes') onUpdate()
        else onLaunchWithoutUpdate()
        return
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        onLaunchWithoutUpdate()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [focused, onUpdate, onLaunchWithoutUpdate])

  useGamepadButtonPress(BTN_ACTION, () => {
    if (focused === 'yes') onUpdate()
    else onLaunchWithoutUpdate()
  })
  useGamepadButtonPress(BTN_BACK, onLaunchWithoutUpdate)

  const confirmLabel = gamepadConnected ? actionButtonLabel : 'Enter'
  const dismissLabel = gamepadConnected ? backButtonLabel : 'Esc'

  return (
    <div className="consoleLaunchOverlay" role="alertdialog" aria-live="assertive">
      <div className="consoleLaunchText">{t('box.update.title')}</div>
      <div className="consoleLaunchGameTitle">{game.title}</div>
      <p className="consoleUpdateNoticeBody">{t('box.update.message')}</p>
      <div className="consoleUpdateNoticeButtons">
        <button
          ref={yesRef}
          className={classNames('consoleChip', { active: focused === 'yes' })}
          onClick={onUpdate}
          onMouseEnter={() => setFocused('yes')}
          onFocus={() => setFocused('yes')}
        >
          <kbd>{confirmLabel}</kbd> {t('box.yes')}
        </button>
        <button
          ref={noRef}
          className={classNames('consoleChip', { active: focused === 'no' })}
          onClick={onLaunchWithoutUpdate}
          onMouseEnter={() => setFocused('no')}
          onFocus={() => setFocused('no')}
        >
          <kbd>{dismissLabel}</kbd> {t('box.no')}
        </button>
      </div>
    </div>
  )
}
