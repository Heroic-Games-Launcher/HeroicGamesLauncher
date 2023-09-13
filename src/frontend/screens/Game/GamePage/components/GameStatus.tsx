import React, { useContext } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, InstallProgress } from 'common/types'
import { getProgress } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface Props {
  gameInfo: GameInfo
  handleUpdate: () => void
  hasUpdate: boolean
  progress: InstallProgress
}

const GameStatus = ({ gameInfo, progress, handleUpdate, hasUpdate }: Props) => {
  const { t } = useTranslation('gamepage')
  const { runner, is } = useContext(GameContext)

  function getInstallLabel(
    is_installed: boolean,
    notAvailable?: boolean
  ): React.ReactNode {
    const { eta, bytes, percent, file } = progress

    if (runner === 'gog' && is.notInstallable) {
      return t(
        'status.gog-goodie',
        "This game doesn't appear to be installable. Check downloadable content on https://gog.com/account"
      )
    }

    if (is.notSupportedGame) {
      return t(
        'status.this-game-uses-third-party',
        'This game uses third party launcher and it is not supported yet'
      )
    }

    if (notAvailable) {
      return t('status.gameNotAvailable', 'Game not available')
    }

    if (is.uninstalling) {
      return t('status.uninstalling', 'Uninstalling')
    }

    if (is.reparing) {
      return `${t('status.reparing')} ${percent ? `${percent}%` : '...'}`
    }

    if (is.moving) {
      if (file && percent) {
        return `${t(
          'status.moving-files',
          `Moving file '{{file}}': {{percent}} `,
          { file, percent }
        )}  
        `
      }

      return `${t('status.moving', 'Moving Installation, please wait')} ...`
    }

    const currentProgress =
      getProgress(progress) >= 99
        ? ''
        : `${
            percent && bytes
              ? `${percent}% [${bytes}] ${eta ? `ETA: ${eta}` : ''}`
              : '...'
          }`

    if (is.updating && is_installed) {
      if (!currentProgress) {
        return `${t('status.processing', 'Processing files, please wait')}...`
      }
      if (eta && eta.includes('verifying')) {
        return `${t('status.reparing')}: ${percent} [${bytes}]`
      }
      return `${t('status.updating')} ${currentProgress}`
    }

    if (!is.updating && is.installing) {
      if (!currentProgress) {
        return `${t('status.processing', 'Processing files, please wait')}...`
      }
      return `${t('status.installing')} ${currentProgress}`
    }

    if (is.queued) {
      return `${t('status.queued', 'Queued')}`
    }

    if (hasUpdate) {
      return (
        <span onClick={async () => handleUpdate()} className="updateText">
          {`${t('status.installed')} - ${t(
            'status.hasUpdates',
            'New Version Available!'
          )} (${t('status.clickToUpdate', 'Click to Update')})`}
        </span>
      )
    }

    if (is_installed) {
      return t('status.installed')
    }

    return t('status.notinstalled')
  }

  return (
    <div className="gameStatus">
      {(is.installing || is.updating) && (
        <progress
          className="installProgress"
          max={100}
          value={getProgress(progress)}
        />
      )}
      <p
        style={{
          color: is.installing
            ? 'var(--success)'
            : 'var(--status-warning,  var(--warning))',
          fontStyle: 'italic'
        }}
      >
        {is.installing && (
          <Link to={'/download-manager'}>
            {getInstallLabel(gameInfo.is_installed, is.notAvailable)}
          </Link>
        )}
        {!is.installing &&
          getInstallLabel(gameInfo.is_installed, is.notAvailable)}
      </p>
    </div>
  )
}

export default GameStatus
