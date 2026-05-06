import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { hasStatus } from 'frontend/hooks/hasStatus'

import BackHint from '../BackHint'

import type { GameInfo } from 'common/types'

export default function LaunchOverlay({
  game,
  holdStart,
  gamepadConnected,
  backButtonLabel
}: {
  game: GameInfo
  holdStart: number | null
  gamepadConnected: boolean
  backButtonLabel: string
}) {
  const { t } = useTranslation()
  const { status, statusContext } = hasStatus(game)

  let label: string | null = null
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
      <div className="consoleLaunchGameTitle">{game.title}</div>
      <BackHint
        prefix={t('console.cancel.hintPrefix', 'Hold')}
        suffix={t('console.cancel.hintSuffix', 'for 3s to cancel')}
        gamepadConnected={gamepadConnected}
        backButtonLabel={backButtonLabel}
        active={holdStart != null}
      />
    </div>
  )
}
