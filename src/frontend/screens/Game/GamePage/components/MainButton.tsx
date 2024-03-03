import React, {
  useContext,
  DetailedHTMLProps,
  ButtonHTMLAttributes
} from 'react'
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

// we can't just use HTMLProps because of inconsistency in button's "type" attribute
interface Props
  extends DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {
  gameInfo: GameInfo
  handlePlay: (gameInfo: GameInfo) => Promise<void>
  handleInstall: (
    is_installed: boolean
  ) => Promise<void | { status: 'done' | 'error' | 'abort' }>
}

const MainButton = ({
  gameInfo,
  handlePlay,
  handleInstall,
  ...other
}: Props) => {
  const { t } = useTranslation('gamepage')
  const { is } = useContext(GameContext)

  function getPlayLabel(): React.ReactNode {
    if (is.syncing) {
      return (
        <span className="buttonWithIcon">
          {t('label.saves.syncing')}
          <CloudQueue
            style={{
              marginLeft: '5px'
            }}
          />
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
          {t('label.playing.stop')}
          <Stop />
        </span>
      )
    }

    return (
      <span className="buttonWithIcon">
        {t('label.playing.start')}
        <PlayArrow />
      </span>
    )
  }

  function getButtonLabel() {
    if (is.notInstallable) {
      return (
        <span className="buttonWithIcon">
          {t('status.goodie', 'Not installable')}
          <Error style={{ marginLeft: '5px', cursor: 'not-allowed' }} />
        </span>
      )
    }
    if (is.notSupportedGame) {
      return (
        <span className="buttonWithIcon">
          {t('status.notSupported', 'Not supported')}
          <Warning
            style={{
              marginLeft: '5px',
              cursor: 'not-allowed'
            }}
          />
        </span>
      )
    }

    if (is.queued) {
      return (
        <span className="buttonWithIcon">
          {t('button.queue.remove', 'Remove from Queue')}
          <Cancel
            style={{
              marginLeft: '5px'
            }}
          />
        </span>
      )
    }

    if (is.installing) {
      return (
        <span className="buttonWithIcon">
          {t('button.cancel')}
          <Pause
            style={{
              marginLeft: '5px'
            }}
          />
        </span>
      )
    }
    return (
      <span className="buttonWithIcon">
        {t('button.install')}
        <Download
          style={{
            marginLeft: '5px'
          }}
        />
      </span>
    )
  }

  const is_installed = gameInfo.is_installed

  const extraClassName = other.className

  if (extraClassName) {
    // do not override internal classNames
    delete other.className
  }

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
            extraClassName
          )}
          {...other}
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
            extraClassName
          )}
          {...other}
        >
          {getButtonLabel()}
        </button>
      )}
    </>
  )
}

export default MainButton
