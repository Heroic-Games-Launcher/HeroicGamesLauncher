import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import { hasStatus } from 'frontend/hooks/hasStatus'

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
  const { t: tGame } = useTranslation('gamepage')
  const { status, statusContext } = hasStatus(game)

  let label: string | null = null
  switch (status) {
    case 'syncing-saves':
      label = tGame('status.syncingSaves', 'Syncing Saves')
      break
    case 'redist':
      label = tGame(
        'status.redist',
        'Installing Redistributables ({{redist}})',
        { redist: statusContext || '' }
      )
      break
    case 'winetricks':
      label = tGame('status.winetricks', 'Applying Winetricks fixes')
      break
    case 'launching':
      label = tGame('status.launching', 'Launching')
      break
    case 'playing':
      label = tGame('status.playing', 'Playing')
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
      <div
        className={classNames('consoleLaunchHint', {
          active: holdStart != null
        })}
      >
        {t('console.cancel.hintPrefix', 'Hold')}{' '}
        <kbd>{gamepadConnected ? backButtonLabel : 'Esc'}</kbd>{' '}
        {t('console.cancel.hintSuffix', 'for 3s to cancel')}
      </div>
    </div>
  )
}
