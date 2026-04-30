import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import './index.scss'

import { hasStatus } from 'frontend/hooks/hasStatus'

import type { GameInfo } from 'common/types'
import { useEffect } from 'react'
import { install } from 'frontend/helpers'
import { hasProgress } from 'frontend/hooks/hasProgress'

export default function InstallOverlay({
  game,
  onDismiss
}: {
  game: GameInfo
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const { status, statusContext } = hasStatus(game)
  const [progress] = hasProgress(game.app_name, game.runner)

  let label: string | null = null

  const onOverlayKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDismiss()
      return
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', onOverlayKeyDown)
    return () => {
      window.removeEventListener('keydown', onOverlayKeyDown)
    }
  }, [])

  const installGame = () => {
    try {
      install({
        gameInfo: game,
        previousProgress: null,
        progress: progress,
        installPath: 'default',
        isInstalling: false,
        t,
        showDialogModal: () => <div>Dialog Modal</div>
      })

      // we're now installing, close modal
      onDismiss()
    } catch {}
  }

  return (
    <div className="consoleInstallOverlay" role="status" aria-live="polite">
      {/* set modal */}
      <div className="consoleModal">
        {/* list game info to install */}
        <div className="consoleLaunchText">
          {label || t('status.installing', 'Installing')}
        </div>
        <div className="consoleLaunchGameTitle">{game.title}</div>
        {/* list runner to be used */}

        <div>{t('status.installing', 'Installing')}</div>
        {/* Confirm or Cancel buttons */}
        <div className="consoleInstallButtons">
          <button onClick={onDismiss}>Cancel</button>
          <button onClick={installGame}>Install</button>
        </div>
      </div>
    </div>
  )
}
