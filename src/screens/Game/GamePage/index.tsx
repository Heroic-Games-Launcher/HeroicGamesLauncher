import './index.css'

import React, { useContext, useEffect, useState, MouseEvent } from 'react'

import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft'

import { IpcRenderer } from 'electron'
import {
  getGameInfo,
  getInstallInfo,
  getProgress,
  launch,
  sendKill,
  size,
  syncSaves
} from 'src/helpers'
import { Link, NavLink, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import { UpdateComponent, SelectField } from 'src/components/UI'

import { updateGame } from 'src/helpers'

import { AppSettings, GameInfo, GameStatus, InstallInfo } from 'src/types'

import GamePicture from '../GamePicture'
import TimeContainer from '../TimeContainer'

import GameRequirements from '../GameRequirements'
import { GameSubMenu } from '..'
import { InstallModal } from 'src/screens/Library/components'
import { install } from 'src/helpers/library'
import EpicLogo from 'src/assets/epic-logo.svg'
import GOGLogo from 'src/assets/gog-logo.svg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { hasProgress } from 'src/hooks/hasProgress'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

// This component is becoming really complex and it needs to be refactored in smaller ones

export default function GamePage(): JSX.Element | null {
  const { appName } = useParams() as { appName: string }
  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const [tabToShow, setTabToShow] = useState('infoTab')
  const [showModal, setShowModal] = useState({ game: '', show: false })

  const { libraryStatus, handleGameStatus, epic, gog, gameUpdates, platform } =
    useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}
  const [progress, previousProgress] = hasProgress(appName)
  const [gameInfo, setGameInfo] = useState({} as GameInfo)
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [savesPath, setSavesPath] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [gameInstallInfo, setGameInstallInfo] = useState({} as InstallInfo)
  const [launchArguments, setLaunchArguments] = useState('')
  const [hasError, setHasError] = useState<{
    error: boolean
    message: string | unknown
  }>({ error: false, message: '' })

  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'

  const isInstalling = status === 'installing'
  const isPlaying = status === 'playing'
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const hasDownloads = Boolean(
    libraryStatus.filter(
      (game) => game.status === 'installing' || game.status === 'updating'
    ).length
  )

  useEffect(() => {
    const updateConfig = async () => {
      try {
        let newInfo = await getGameInfo(appName, 'legendary')
        if (!newInfo) {
          newInfo = await getGameInfo(appName, 'gog')
        }
        setGameInfo(newInfo)
        const { install, is_linux_native, is_mac_native, runner } = newInfo

        const installPlatform =
          install.platform || (is_linux_native && isLinux)
            ? 'Linux'
            : is_mac_native && isMac
            ? 'Mac'
            : 'Windows'

        getInstallInfo(appName, runner, installPlatform)
          .then((info) => {
            if (!info) {
              throw 'Cannot get game info'
            }
            setGameInstallInfo(info)
          })
          .catch((error) => {
            console.error(error)
            ipcRenderer.send('logError', error)
            setHasError({ error: true, message: error })
          })
        if (newInfo?.cloud_save_enabled) {
          try {
            const { autoSyncSaves, savesPath }: AppSettings =
              await ipcRenderer.invoke('requestSettings', appName)
            setAutoSyncSaves(autoSyncSaves)
            return setSavesPath(savesPath)
          } catch (error) {
            setHasError({ error: true, message: error })
            ipcRenderer.send('logError', error)
          }
        }
      } catch (error) {
        console.error({ error })
        setHasError({ error: true, message: error })
      }
    }
    updateConfig()
  }, [isInstalling, isPlaying, appName, epic, gog])

  async function handleUpdate() {
    await handleGameStatus({
      appName,
      runner: gameInfo.runner,
      status: 'updating'
    })
    await updateGame(appName, gameInfo.runner)
    await handleGameStatus({ appName, runner: gameInfo.runner, status: 'done' })
  }

  function handleModal() {
    setShowModal({ game: appName, show: true })
  }

  const hasUpdate = gameUpdates?.includes(appName)

  if (gameInfo && gameInfo.install) {
    const {
      runner,
      title,
      art_square,
      install: {
        install_path,
        install_size,
        version,
        platform: installPlatform
      },
      is_installed,
      is_game,
      compatible_apps,
      extra,
      developer,
      cloud_save_enabled,
      canRunOffline
    }: GameInfo = gameInfo
    const downloadSize =
      gameInstallInfo?.manifest?.download_size &&
      size(Number(gameInstallInfo?.manifest?.download_size))
    const installSize =
      gameInstallInfo?.manifest?.disk_size &&
      size(Number(gameInstallInfo?.manifest?.disk_size))
    const launchOptions = gameInstallInfo?.game?.launch_options || []

    const isMac = ['osx', 'Mac']
    const isMacNative = isMac.includes(installPlatform ?? '')
    const isLinuxNative = installPlatform === 'linux'
    const isNative = isWin || isMacNative || isLinuxNative
    const pathname = isNative
      ? `/settings/${appName}/other`
      : `/settings/${appName}/wine`

    /*
    Other Keys:
    t('box.stopInstall.title')
    t('box.stopInstall.message')
    t('box.stopInstall.keepInstalling')
    */

    const onTabClick = (event: MouseEvent) => {
      const button = event.target as HTMLButtonElement
      const tab = button.dataset.tab
      setTabToShow(`${tab}Tab`)
    }

    if (hasError.error) {
      const message =
        typeof hasError.message === 'string'
          ? hasError.message
          : 'Unknown error'
      return <div>{message}</div>
    }

    return (
      <div className="gameConfigContainer">
        {showModal.show && (
          <InstallModal
            appName={showModal.game}
            runner={runner}
            backdropClick={() => setShowModal({ game: '', show: false })}
          />
        )}
        {title ? (
          <>
            <GamePicture art_square={art_square} store={runner} />
            <NavLink
              className="backButton"
              to="/"
              title={t2('webview.controls.back', 'Go Back')}
            >
              <ArrowCircleLeftIcon />
            </NavLink>
            <div className="store-icon">
              <img
                src={runner === 'legendary' ? EpicLogo : GOGLogo}
                className={runner === 'legendary' ? '' : 'gogIcon'}
                alt=""
              />
            </div>
            <div className={`gameTabs ${tabToShow}`}>
              {is_game && (
                <>
                  <nav>
                    <button data-tab="info" onClick={onTabClick}>
                      Info
                    </button>
                    <button data-tab="tools" onClick={onTabClick}>
                      Tools
                    </button>
                    <button data-tab="requirements" onClick={onTabClick}>
                      System Requirements
                    </button>
                  </nav>

                  <div className="gameInfo">
                    <h1 className="title">{title}</h1>
                    <div className="infoWrapper">
                      <div className="developer">{developer}</div>
                      {!is_game && (
                        <div className="compatibleApps">
                          {compatible_apps.join(', ')}
                        </div>
                      )}
                      <div className="summary">
                        {extra && extra.about
                          ? extra.about.shortDescription
                            ? extra.about.shortDescription
                            : extra.about.description
                            ? extra.about.description
                            : ''
                          : ''}
                      </div>
                      {is_installed && cloud_save_enabled && is_game && (
                        <div
                          style={{
                            color: autoSyncSaves ? '#07C5EF' : ''
                          }}
                        >
                          {t('info.syncsaves')}:{' '}
                          {autoSyncSaves ? t('enabled') : t('disabled')}
                        </div>
                      )}
                      {!is_installed && (
                        <>
                          <div>
                            {t('game.downloadSize', 'Download Size')}:{' '}
                            {downloadSize ?? '...'}
                          </div>
                          <div>
                            {t('game.installSize', 'Install Size')}:{' '}
                            {installSize ?? '...'}
                          </div>
                          <br />
                        </>
                      )}
                      {is_installed && (
                        <>
                          <div>
                            {t('info.size')}: {install_size}
                          </div>
                          <div style={{ textTransform: 'capitalize' }}>
                            {t('info.installedPlatform', 'Installed Platform')}:{' '}
                            {installPlatform === 'osx'
                              ? 'MacOS'
                              : installPlatform}
                          </div>
                          <div>
                            {t('info.version')}: {version}
                          </div>
                          <div>
                            {t('info.canRunOffline', 'Online Required')}:{' '}
                            {t(canRunOffline ? 'box.no' : 'box.yes')}
                          </div>
                          <div
                            className="clickable"
                            onClick={() =>
                              ipcRenderer.send('openFolder', install_path)
                            }
                          >
                            {t('info.path')}: {install_path}
                          </div>
                          <br />
                        </>
                      )}
                    </div>
                    <TimeContainer game={appName} />
                    <div className="gameStatus">
                      {isInstalling && (
                        <progress
                          className="installProgress"
                          max={100}
                          value={getProgress(progress)}
                        />
                      )}
                      <p
                        style={{
                          color:
                            is_installed || isInstalling
                              ? 'var(--success)'
                              : 'var(--danger)',
                          fontStyle: 'italic'
                        }}
                      >
                        {getInstallLabel(is_installed)}
                      </p>
                    </div>
                    {is_installed && Boolean(launchOptions?.length) && (
                      <SelectField
                        htmlId="launch_options"
                        onChange={(event) =>
                          setLaunchArguments(event.target.value)
                        }
                        value={launchArguments}
                        prompt={t('launch.options', 'Launch Options...')}
                      >
                        {launchOptions.map(({ name, parameters }) => (
                          <option key={parameters} value={parameters}>
                            {name}
                          </option>
                        ))}
                      </SelectField>
                    )}
                    <div className="buttonsWrapper">
                      {is_installed && is_game && (
                        <>
                          <button
                            disabled={isReparing || isMoving || isUpdating}
                            onClick={handlePlay()}
                            className={`button ${getPlayBtnClass()}`}
                          >
                            {getPlayLabel()}
                          </button>
                        </>
                      )}
                      {is_installed ? (
                        <Link
                          to={pathname}
                          state={{
                            fromGameCard: false,
                            runner,
                            isLinuxNative: isNative,
                            isMacNative: isNative,
                            hasCloudSave: cloud_save_enabled
                          }}
                          className={`button ${getButtonClass(is_installed)}`}
                        >
                          {`${getButtonLabel(is_installed)}`}
                        </Link>
                      ) : (
                        <button
                          onClick={async () => handleInstall(is_installed)}
                          disabled={
                            isPlaying ||
                            isUpdating ||
                            isReparing ||
                            isMoving ||
                            (hasDownloads && !isInstalling)
                          }
                          className={`button ${getButtonClass(is_installed)}`}
                        >
                          {`${getButtonLabel(is_installed)}`}
                        </button>
                      )}
                    </div>
                    {is_installed && (
                      <NavLink
                        to={`/settings/${appName}/log`}
                        state={{
                          fromGameCard: false,
                          runner,
                          isLinuxNative: isNative,
                          isMacNative: isNative,
                          hasCloudSave: cloud_save_enabled
                        }}
                        className="clickable reportProblem"
                      >
                        <>
                          {<FontAwesomeIcon icon={faTriangleExclamation} />}
                          {t(
                            'report_problem',
                            'Report a problem running this game'
                          )}
                        </>
                      </NavLink>
                    )}
                  </div>

                  <GameSubMenu
                    appName={appName}
                    isInstalled={is_installed}
                    title={title}
                    storeUrl={gameInfo.store_url}
                    runner={gameInfo.runner}
                  />
                  <GameRequirements gameInfo={gameInfo} />
                </>
              )}
            </div>
          </>
        ) : (
          <UpdateComponent />
        )}
      </div>
    )
  }
  return <UpdateComponent />

  function getPlayBtnClass() {
    if (isUpdating) {
      return 'is-danger'
    }
    if (isSyncing) {
      return 'is-primary'
    }
    return isPlaying ? 'is-tertiary' : 'is-success'
  }

  function getPlayLabel(): React.ReactNode {
    if (isSyncing) {
      return t('label.saves.syncing')
    }

    return isPlaying ? t('label.playing.stop') : t('label.playing.start')
  }

  function getInstallLabel(is_installed: boolean): React.ReactNode {
    const { eta, bytes, percent } = progress

    if (isReparing) {
      return `${t('status.reparing')} ${percent ? `${percent}` : '...'}`
    }

    if (isMoving) {
      return `${t('status.moving')}`
    }

    const currentProgress = `${
      percent && bytes && eta ? `${percent} [${bytes}] | ETA: ${eta}` : '...'
    }`

    if (isUpdating && is_installed) {
      if (eta && eta.includes('verifying')) {
        return `${t('status.reparing')}: ${percent} [${bytes}]`
      }
      return `${t('status.updating')} ${currentProgress}`
    }

    if (!isUpdating && isInstalling) {
      return `${t('status.installing')} ${currentProgress}`
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

  function getButtonClass(is_installed: boolean) {
    if (isInstalling) {
      return 'is-danger'
    }

    if (is_installed) {
      return 'is-primary'
    }
    return 'is-secondary'
  }

  function getButtonLabel(is_installed: boolean) {
    if (is_installed) {
      return t('submenu.settings')
    }
    if (isInstalling) {
      return t('button.cancel')
    }
    return t('button.install')
  }

  function handlePlay() {
    return async () => {
      if (status === 'playing' || status === 'updating') {
        return sendKill(appName, gameInfo.runner)
      }

      if (autoSyncSaves) {
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }
      await launch({
        appName,
        t,
        launchArguments,
        runner: gameInfo.runner,
        hasUpdate
      })

      if (autoSyncSaves) {
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }
    }
  }

  async function handleInstall(is_installed: boolean) {
    if (!is_installed && !isInstalling) {
      return handleModal()
    }

    const gameStatus: GameStatus = libraryStatus.filter(
      (game) => game.appName === appName
    )[0]
    const { folder } = gameStatus
    if (!folder) {
      return
    }

    return install({
      appName,
      handleGameStatus,
      installPath: folder,
      isInstalling,
      previousProgress,
      progress,
      t,
      runner: gameInfo.runner,
      platformToInstall: ''
    })
  }
}
