import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import './index.scss'

import { hasStatus } from 'frontend/hooks/hasStatus'

import type { GameInfo } from 'common/types'
import { useEffect } from 'react'

export default function InstallOverlay({
  game,
  onDismiss
}: {
  game: GameInfo
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const { status, statusContext } = hasStatus(game)

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

  return (
    <div className="consoleInstallOverlay" role="status" aria-live="polite">
      {/* set modal */}
      <div className="consoleModal">
        {/* list game info to install */}

        {/* list runner to be used */}

        {/* Confirm or Cancel buttons */}
        <div className="consoleLaunchText">
          {label || t('console.launching', 'Launching')}
        </div>
        <div className="consoleLaunchGameTitle">{game.title}</div>
      </div>
    </div>
  )
}
