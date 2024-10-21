import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import {
  Cancel,
  CloudQueue,
  Download,
  Error,
  Pause,
  PlayArrow,
  Stop,
  Warning
} from '@mui/icons-material'
import classNames from 'classnames'
import { GameInfo } from 'common/types'

interface Props {
  gameInfo: GameInfo
  handlePlay: (gameInfo: GameInfo) => Promise<void>
  handleInstall: (
    is_installed: boolean
  ) => Promise<void | { status: 'done' | 'error' | 'abort' }>
}

const MainButton = ({ gameInfo, handlePlay, handleInstall }: Props) => {
  const { t } = useTranslation('gamepage')
  const { is } = useContext(GameContext)

  function getPlayLabel(): React.ReactNode {
    if (is.syncing) {
      return (
        <span className="buttonWithIcon">
          <CloudQueue />
          {t('label.saves.syncing')}
        </span>
      )
    }
    if (is.installingRedist) {
      return t('label.redist', 'Installing Redistributables')
    }
    if (is.installingWinetricksPackages) {
      return t('label.winetricks', 'Installing Winetricks Packages')
    }
    if (is.launching) {
      return t('label.launching', 'Launching')
    }

    if (is.playing) {
      return (
        <span className="buttonWithIcon">
          <Stop data-icon="stop" />
          {t('label.playing.stop')}
        </span>
      )
    }

    return (
      <span className="buttonWithIcon">
        <PlayArrow data-icon="play" />
        {t('label.playing.start')}
      </span>
    )
  }

  function getButtonLabel() {
    if (is.notInstallable) {
      return (
        <span className="buttonWithIcon">
          <Error style={{ cursor: 'not-allowed' }} />
          {t('status.goodie', 'Not installable')}
        </span>
      )
    }
    if (is.notSupportedGame) {
      return (
        <span className="buttonWithIcon">
          <Warning
            style={{
              cursor: 'not-allowed'
            }}
          />
          {t('status.notSupported', 'Not supported')}
        </span>
      )
    }

    if (is.queued) {
      return (
        <span className="buttonWithIcon">
          <Cancel />
          {t('button.queue.remove', 'Remove from Queue')}
        </span>
      )
    }

    if (is.installing) {
      return (
        <span className="buttonWithIcon">
          <Pause />
          {t('button.cancel')}
        </span>
      )
    }
    return (
      <span className="buttonWithIcon">
        <Download />
        {t('button.install')}
      </span>
    )
  }

  const is_installed = gameInfo.is_installed

  return (
    <>
      {is_installed && !is.queued && (
        <button
          disabled={
            is.reparing ||
            is.moving ||
            is.updating ||
            is.uninstalling ||
            is.syncing ||
            is.launching ||
            is.installingWinetricksPackages ||
            is.installingRedist
          }
          autoFocus={true}
          onClick={async () => handlePlay(gameInfo)}
          className={classNames(
            'button',
            {
              'is-secondary': !is_installed && !is.queued,
              'is-success':
                is.syncing ||
                (!is.updating &&
                  !is.playing &&
                  is_installed &&
                  !is.notAvailable),
              'is-tertiary':
                is.playing ||
                (!is_installed && is.queued) ||
                (is_installed && is.notAvailable),
              'is-disabled': is.updating
            },
            'mainBtn'
          )}
        >
          {getPlayLabel()}
        </button>
      )}
      {(!is_installed || is.queued) && (
        <button
          onClick={async () => handleInstall(is_installed)}
          disabled={
            is.playing ||
            is.updating ||
            is.reparing ||
            is.moving ||
            is.uninstalling ||
            is.notSupportedGame ||
            is.notInstallable
          }
          autoFocus={true}
          className={classNames(
            'button',
            {
              'is-primary': is_installed,
              'is-tertiary':
                is.notAvailable ||
                is.installing ||
                is.queued ||
                is.notInstallable,
              'is-secondary': !is_installed && !is.queued
            },
            'mainBtn'
          )}
        >
          {getButtonLabel()}
        </button>
      )}
    </>
  )
}

export default MainButton
