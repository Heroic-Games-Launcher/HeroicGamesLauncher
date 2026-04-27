import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { useSound } from 'use-sound'

import './index.scss'

import { hasStatus } from 'frontend/hooks/hasStatus'

import BackHint from '../BackHint'

import type { GameInfo, Runner } from 'common/types'
import { useContext, useEffect } from 'react'
import { useCancelOnHold, useGamepadButtonHold } from '../../hooks'
import { BTN_BACK } from '../../controller'
import { launch, sendKill } from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'
import startSound from 'frontend/assets/console-mode-game-start.mp3'

const CANCEL_HOLD_MS = 3000

export default function LaunchOverlay({
  game,
  onDismiss
}: {
  game: GameInfo
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const { status, statusContext } = hasStatus(game)
  let label: string | null = null

  const { showDialogModal, consoleModeSounds } = useContext(ContextProvider)

  // Hold-to-cancel for in-flight launches. Triggered by Escape (keyboard) or
  // the back button (gamepad); fires `sendKill` after CANCEL_HOLD_MS.
  const { holdStart, startHold, stopHold } = useCancelOnHold({
    active: !!game,
    holdMs: CANCEL_HOLD_MS,
    onCancel: () => {
      if (game) void sendKill(game.app_name, game.runner)

      // prevent UX from hanging in "Launching" mode
      onDismiss()
    }
  })

  const [playStartSound] = useSound(startSound, {
    soundEnabled: consoleModeSounds
  })

  // Escape quits when idle; hold it while launching to cancel.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()

      if (!e.repeat) startHold()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopHold()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [startHold, stopHold])

  // Fire the launch exactly once on mount; the overlay closes via onDismiss
  // in the finally block. Intentionally not depending on the launch inputs.
  useEffect(() => {
    playStartSound()

    void launch({
      appName: game.app_name,
      t,
      runner: game.runner as Runner,
      hasUpdate: false,
      showDialogModal
    }).finally(() => {
      onDismiss()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playStartSound])

  useGamepadButtonHold(
    BTN_BACK,
    (held) => (held ? startHold() : stopHold()),
    !!game
  )

  switch (status) {
    case 'syncing-saves':
      label = t('gamepage:status.syncingSaves', 'Syncing Saves')
      break
    case 'redist':
      label = t(
        'gamepage:status.redist',
        'Installing Redistributables ({{redist}})',
        { redist: statusContext || '' }
      )
      break
    case 'winetricks':
      label = t('gamepage:status.winetricks', 'Applying Winetricks fixes')
      break
    case 'launching':
      label = t('gamepage:status.launching', 'Launching')
      break
    case 'playing':
      label = t('gamepage:status.playing', 'Playing')
      break
  }

  return (
    <div className="consoleLaunchOverlay" role="status" aria-live="polite">
      <div
        className={classNames('consoleLaunchSpinner', {
          idle: status === 'playing'
        })}
      />
      <div className="consoleLaunchText">
        {label || t('console.launching', 'Launching')}
      </div>
      <div className="consoleLaunchGameTitle">
        {game.overrides?.title || game.title}
      </div>
      <BackHint
        prefix={t('console.cancel.hintPrefix', 'Hold')}
        suffix={t('console.cancel.hintSuffix', 'for 3s to cancel')}
        active={holdStart != null}
      />
    </div>
  )
}
