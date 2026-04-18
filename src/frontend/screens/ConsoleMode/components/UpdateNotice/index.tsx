import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useGamepadButtonPress } from '../../hooks'

import type { GameInfo } from 'common/types'

const DISMISS_BUTTON_INDEX = 1 // B / Circle

export default function UpdateNotice({
  game,
  onDismiss,
  gamepadConnected,
  backButtonLabel
}: {
  game: GameInfo
  onDismiss: () => void
  gamepadConnected: boolean
  backButtonLabel: string
}) {
  const { t } = useTranslation()

  useEffect(() => {
    // Read by gamepad.ts to block the global `back` action from navigating
    // away from /console while this modal is open.
    document.body.classList.add('console-modal-open')
    return () => document.body.classList.remove('console-modal-open')
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onDismiss])

  useGamepadButtonPress(DISMISS_BUTTON_INDEX, onDismiss)

  return (
    <div
      className="consoleLaunchOverlay"
      role="alertdialog"
      aria-live="assertive"
      onClick={onDismiss}
    >
      <div className="consoleLaunchText">
        {t('console.update.title', 'Update required')}
      </div>
      <div className="consoleLaunchGameTitle">{game.title}</div>
      <p className="consoleUpdateNoticeBody">
        {t(
          'console.update.body',
          'This game has an update available. Please leave Console Mode and update the game before launching.'
        )}
      </p>
      <div className="consoleLaunchHint">
        {t('console.update.hintPrefix', 'Press')}{' '}
        <kbd>{gamepadConnected ? backButtonLabel : 'Esc'}</kbd>{' '}
        {t('console.update.hintSuffix', 'to go back')}
      </div>
    </div>
  )
}
