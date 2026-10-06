import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import GameContext from '../../GameContext'
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
import { GameInfo } from 'common/types'
import useSetting from 'frontend/hooks/useSetting'
import { Button } from 'frontend/components/UI'

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
  const [verboseLogs, setVerboseLogs] = useSetting('verboseLogs', true)

  const is_installed = gameInfo.is_installed
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
      <button className="Button Button--primary Button--md altPlay">
        <ArrowBackIosNew />
        <a
          className="Button Button--primary Button--md"
          onClick={handleAltLaunch}
        >
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

  return (
    <div className="buttonsWrapper">
      {is_installed && !is.queued && !is.uninstalling && (
        <div className="playButtons">
          <Button
            variant={
              is.playing || is.notAvailable || is.updating ? 'ghost' : 'primary'
            }
            disabled={disabledPlayButtons}
            autoFocus={true}
            onClick={() => handlePlay(gameInfo)}
            className="mainBtn"
          >
            {getPlayLabel()}
          </Button>
          {altPlayAction()}
        </div>
      )}
      {(!is_installed || is.queued) && (
        <span className="installButtons">
          <Button
            onClick={() => {
              if (!is_installed && !is.queued && !is.installing) {
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
            className="mainBtn"
            variant={
              is.notAvailable || is.installing || is.queued || is.notInstallable
                ? 'ghost'
                : 'primary'
            }
          >
            {getButtonLabel()}
          </Button>
          <Button
            variant="secondary"
            disabled={disabledInstallButtons || is.installing || is.importing}
            className="mainBtn"
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
          </Button>
        </span>
      )}
    </div>
  )
}

export default MainButton
