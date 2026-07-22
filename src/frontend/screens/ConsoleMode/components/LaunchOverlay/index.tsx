import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import './index.scss'

import { hasStatus } from 'frontend/hooks/hasStatus'

import BackHint from '../BackHint'

import type { GameInfo } from 'common/types'
import { useCallback, useContext, useEffect, useState } from 'react'
import { useCancelOnHold, useGamepadButtonHold } from '../../hooks'
import { BTN_BACK } from '../../controller'
import { launch, sendKill } from 'frontend/helpers'
import ContextProvider from 'frontend/state/ContextProvider'

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

  const { showDialogModal } = useContext(ContextProvider)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  // Turns a raw launch error into a user-facing message, with a friendlier
  // hint for the common "not logged in to Steam" case.
  const buildLaunchErrorMessage = useCallback(
    (errMsg?: string): string => {
      if (
        errMsg &&
        (errMsg.includes('not logged in') || errMsg.includes('aurelia login'))
      ) {
        return t(
          'console.launchErrorNotLoggedIn',
          'Failed to launch game. You must log in to Steam first.'
        )
      }
      if (errMsg) {
        return `${t('console.launchErrorPrefix', 'Failed to launch game:')} ${errMsg}`
      }
      return t(
        'console.launchError',
        'Failed to launch game. Check the logs for details.'
      )
    },
    [t]
  )

  // Hold-to-cancel for in-flight launches. Triggered by Escape (keyboard) or
  // the back button (gamepad); fires `sendKill` after CANCEL_HOLD_MS.
  const { holdStart, startHold, stopHold } = useCancelOnHold({
    active: !launchError && !!game,
    holdMs: CANCEL_HOLD_MS,
    onCancel: () => {
      if (game) void sendKill(game.app_name, game.runner)

      // prevent UX from hanging in "Launching" mode
      handleDismiss()
    }
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

  // Fire the launch exactly once on mount. On success the overlay closes; on
  // error it shows the failure and auto-dismisses after a short delay.
  // Intentionally not depending on the launch inputs.
  useEffect(() => {
    const showError = (errMsg?: string) => {
      setLaunchError(buildLaunchErrorMessage(errMsg))
      setTimeout(() => handleDismiss(), errMsg ? 5000 : 3000)
    }
    void launch({
      appName: game.app_name,
      t,
      runner: game.runner,
      hasUpdate: false,
      showDialogModal
    })
      .then((result) => {
        if (result.status === 'error') {
          showError(result.error)
          return
        }
        handleDismiss()
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : String(err))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      {launchError ? (
        <div className="consoleLaunchError">
          <div className="consoleLaunchErrorIcon">!</div>
          <div className="consoleLaunchErrorText">{launchError}</div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
