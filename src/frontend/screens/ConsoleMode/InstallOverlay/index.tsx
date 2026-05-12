import { useTranslation } from 'react-i18next'

import './index.scss'

import type { GameInfo } from 'common/types'
import { useEffect, useRef } from 'react'
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
  const [progress] = hasProgress(game.app_name, game.runner)
  const installButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    // focus action button
    installButtonRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onDismiss])

  const installGame = () => {
    try {
      void install({
        gameInfo: game,
        previousProgress: null,
        progress,
        installPath: 'default',
        isInstalling: false,
        t,
        showDialogModal: () => null
      })

      // we're now installing, close modal
      onDismiss()
    } catch (err) {
      window.api.logError(`Console Mode install failed: ${String(err)}`)
    }
  }

  return (
    <div className="consoleInstallOverlay" role="status" aria-live="polite">
      <div className="consoleModal">
        <div className="consoleModalTitle">
          {t('status.installing', 'Installing')}
        </div>
        <div className="consoleModalGameTitle">{game.title}</div>

        {/* list runner to be used, use InstallModal in the future */}

        {/* Confirm or Cancel buttons */}
        <div className="consoleInstallButtons">
          <button className="consoleChip" onClick={onDismiss}>
            {t('button.cancel', 'Cancel')}
          </button>
          <button
            ref={installButtonRef}
            className="consoleChip"
            onClick={installGame}
          >
            {t('generic.install', 'Install')}
          </button>
        </div>
      </div>
    </div>
  )
}
