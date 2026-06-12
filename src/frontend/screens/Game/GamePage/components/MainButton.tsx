import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import GameContext from '../../GameContext'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  ArrowBackIosNew,
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
import { DownloadManagerState, GameInfo } from 'common/types'
import useSetting from 'frontend/hooks/useSetting'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { handleStopInstallation } from 'frontend/helpers/library'

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
  const { showDialogModal } = useContext(ContextProvider)
  const [verboseLogs, setVerboseLogs] = useSetting('verboseLogs', true)
  const [progress] = hasProgress(gameInfo.app_name, gameInfo.runner)

  // Keep track of the Download Manager state so the button can react to the
  // real download status. When a download is paused the backend reports the
  // game status as "done", so `is.installing`/`is.updating` are no longer
  // reliable on their own to know if there's an ongoing (paused) download.
  const [dmState, setDmState] = useState<DownloadManagerState>('idle')
  const [currentDownloadAppName, setCurrentDownloadAppName] = useState<string>()

  useEffect(() => {
    window.api
      .getDMQueueInformation()
      .then(({ elements, state }) => {
        setCurrentDownloadAppName(elements[0]?.params.appName)
        setDmState(state)
      })
      .catch((error) => {
        console.error('Failed to get DM queue information:', error)
      })

    const removeHandleDMQueueInformation = window.api.handleDMQueueInformation(
      (e, elements, state) => {
        setCurrentDownloadAppName(elements[0]?.params.appName)
        setDmState(state)
      }
    )

    return () => {
      removeHandleDMQueueInformation()
    }
  }, [])

  const is_installed = gameInfo.is_installed

  // This game is the one currently being processed by the Download Manager
  const isCurrentDownload = currentDownloadAppName === gameInfo.app_name
  const isDownloadPaused = dmState === 'paused'

  // Show the pause/cancel controls while the game is actively downloading or
  // while its download is the current (paused) one in the queue.
  const showDownloadControls =
    is.installing || is.updating || (isCurrentDownload && isDownloadPaused)

  const handlePauseResume = () => {
    if (isDownloadPaused) {
      window.api.resumeCurrentDownload()
    } else {
      window.api.pauseCurrentDownload()
    }
  }

  const handleCancelDownload = () => {
    const path =
      gameInfo.install.install_path || gameInfo.folder_name || 'default'
    handleStopInstallation(
      gameInfo.app_name,
      path,
      t,
      progress,
      gameInfo.runner,
      showDialogModal
    )
  }
  const disabledPlayButtons =
    is.reparing ||
    is.moving ||
    is.updating ||
    is.uninstalling ||
    is.syncing ||
    is.launching ||
    is.installingWinetricksPackages ||
    is.installingRedist

  const disabledInstallButtons =
    is.playing ||
    is.updating ||
    is.reparing ||
    is.moving ||
    is.uninstalling ||
    is.notSupportedGame ||
    is.notInstallable ||
    is.importing

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

    if (verboseLogs) {
      return (
        <span className="buttonWithIcon">
          <PlayArrow data-icon="play" />
          {t('label.playing.start_with_logs', 'Play (with logs)')}
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

  function altPlayAction() {
    if (disabledPlayButtons) {
      return <></>
    }

    const label = verboseLogs
      ? t('label.playing.start')
      : t('label.playing.start_with_logs', 'Play Now (with logs)')

    return (
      <button className="button altPlay is-success">
        <ArrowBackIosNew />
        <a className="button" onClick={handleAltLaunch}>
          <span className="buttonWithIcon">
            <PlayArrow data-icon="play" />
            {label}
          </span>
        </a>
      </button>
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

  const handleAltLaunch = async () => {
    setVerboseLogs(!verboseLogs)
    await handlePlay(gameInfo)
  }

  if (showDownloadControls) {
    return (
      <div className="buttonsWrapper">
        <span className="installButtons">
          <button
            onClick={handlePauseResume}
            autoFocus={true}
            className={classNames('button', 'is-tertiary', 'mainBtn')}
          >
            {isDownloadPaused ? (
              <span className="buttonWithIcon">
                <PlayArrow data-icon="play" />
                {t('queue.label.resume', 'Resume download')}
              </span>
            ) : (
              <span className="buttonWithIcon">
                <Pause />
                {t('queue.label.pause', 'Pause download')}
              </span>
            )}
          </button>
          <button
            onClick={handleCancelDownload}
            className={'button mainBtn outline'}
          >
            <span className="buttonWithIcon">
              <Stop data-icon="stop" />
              {t('button.cancel')}
            </span>
          </button>
        </span>
      </div>
    )
  }

  return (
    <div className="buttonsWrapper">
      {is_installed && !is.queued && !is.uninstalling && (
        <div className="playButtons">
          <button
            disabled={disabledPlayButtons}
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
          {altPlayAction()}
        </div>
      )}
      {(!is_installed || is.queued) && (
        <span className="installButtons">
          <button
            onClick={async () => {
              if (!is_installed && !is.queued) {
                openInstallGameModal({
                  appName: gameInfo.app_name,
                  runner: gameInfo.runner,
                  gameInfo,
                  action: 'install'
                })
                return
              }
              handleInstall(is_installed)
            }}
            disabled={disabledInstallButtons}
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
          <button
            disabled={disabledInstallButtons || is.installing || is.importing}
            className={'button mainBtn outline'}
            onClick={() =>
              openInstallGameModal({
                appName: gameInfo.app_name,
                runner: gameInfo.runner,
                gameInfo,
                action: 'import'
              })
            }
          >
            {t('button.import', 'Import Game')}
          </button>
        </span>
      )}
    </div>
  )
}

export default MainButton
