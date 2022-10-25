import './index.scss'

import React, { useContext, useEffect, useState } from 'react'

import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft'

import {
  getGameInfo,
  getInstallInfo,
  getProgress,
  launch,
  sendKill,
  size,
  syncSaves,
  updateGame
} from 'frontend/helpers'
import { Link, NavLink, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { UpdateComponent, SelectField } from 'frontend/components/UI'

import { AppSettings, GameInfo, GameStatus, Runner } from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo, GOGCloudSavesLocation } from 'common/types/gog'

import GamePicture from '../GamePicture'
import TimeContainer from '../TimeContainer'

import GameRequirements from '../GameRequirements'
import { GameSubMenu } from '..'
import { InstallModal } from 'frontend/screens/Library/components'
import { install } from 'frontend/helpers/library'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTriangleExclamation,
  faEllipsisV
} from '@fortawesome/free-solid-svg-icons'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ErrorComponent from 'frontend/components/UI/ErrorComponent'
import Anticheat from 'frontend/components/UI/Anticheat'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'

import StoreLogos from 'frontend/components/UI/StoreLogos'

export default function GamePage(): JSX.Element | null {
  const { appName, runner } = useParams() as { appName: string; runner: Runner }
  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const [showModal, setShowModal] = useState({ game: '', show: false })

  const {
    libraryStatus,
    handleGameStatus,
    epic,
    gog,
    gameUpdates,
    platform,
    showDialogModal
  } = useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}
  const [progress, previousProgress] = hasProgress(appName)
  // @ts-expect-error TODO: Proper default value
  const [gameInfo, setGameInfo] = useState<GameInfo>({})
  const [updateRequested, setUpdateRequested] = useState(false)
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [savesPath, setSavesPath] = useState('')
  const [gogSaves, setGOGSaves] = useState<GOGCloudSavesLocation[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [gameInstallInfo, setGameInstallInfo] = useState<
    LegendaryInstallInfo | GogInstallInfo
    // @ts-expect-error Same as above
  >({})
  const [launchArguments, setLaunchArguments] = useState('')
  const [hasError, setHasError] = useState<{
    error: boolean
    message: string | unknown
  }>({ error: false, message: '' })
  const [winePrefix, setWinePrefix] = useState('')
  const [wineVersion, setWineVersion] = useState('')
  const [showRequirements, setShowRequirements] = useState(false)

  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isSideloaded = runner === 'sideload'

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
        const newInfo = await getGameInfo(appName, runner)
        setGameInfo(newInfo)
        const { install, is_linux_native, is_mac_native } = newInfo

        const installPlatform =
          install.platform || (is_linux_native && isLinux)
            ? 'linux'
            : is_mac_native && isMac
            ? 'Mac'
            : 'Windows'

        if (runner !== 'sideload') {
          getInstallInfo(appName, runner, installPlatform)
            .then((info) => {
              if (!info) {
                throw 'Cannot get game info'
              }
              setGameInstallInfo(info)
            })
            .catch((error) => {
              console.error(error)
              window.api.logError(`${`${error}`}`)
              setHasError({ error: true, message: `${error}` })
            })
        }

        try {
          const {
            autoSyncSaves,
            savesPath,
            gogSaves,
            wineVersion,
            winePrefix
          }: AppSettings = await window.api.requestSettings(appName)

          if (!isWin) {
            let wine = wineVersion.name
              .replace('Wine - ', '')
              .replace('Proton - ', '')
            if (wine.includes('Default')) {
              wine = wine.split('-')[0]
            }
            setWineVersion(wine)
            setWinePrefix(winePrefix)
          }

          if (newInfo?.cloud_save_enabled) {
            setAutoSyncSaves(autoSyncSaves)
            setGOGSaves(gogSaves ?? [])
            return setSavesPath(savesPath)
          }
        } catch (error) {
          setHasError({ error: true, message: error })
          window.api.logError(`${error}`)
        }
      } catch (error) {
        console.error({ error })
        setHasError({ error: true, message: error })
      }
    }
    updateConfig()
  }, [isInstalling, isPlaying, appName, epic, gog])

  async function handleUpdate() {
    setUpdateRequested(true)
    await handleGameStatus({
      appName,
      runner: gameInfo.runner,
      status: 'updating'
    })
    await updateGame(appName, gameInfo.runner)
    await handleGameStatus({ appName, runner: gameInfo.runner, status: 'done' })
    setUpdateRequested(false)
  }

  function handleModal() {
    setShowModal({ game: appName, show: true })
  }

  let hasUpdate = false
  let hasRequirements = false

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
      extra,
      developer,
      cloud_save_enabled,
      canRunOffline,
      folder_name
    }: GameInfo = gameInfo

    hasRequirements = extra?.reqs?.length > 0
    hasUpdate = is_installed && gameUpdates?.includes(appName)
    const appLocation = install_path || folder_name

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
      ? `/settings/${runner}/${appName}/other`
      : `/settings/${runner}/${appName}/wine`

    const showCloudSaveInfo = cloud_save_enabled && !isLinuxNative
    /*
    Other Keys:
    t('box.stopInstall.title')
    t('box.stopInstall.message')
    t('box.stopInstall.keepInstalling')
    */

    if (hasError.error) {
      if (
        hasError.message !== undefined &&
        typeof hasError.message === 'string'
      )
        window.api.logError(hasError.message)
      const message =
        typeof hasError.message === 'string'
          ? hasError.message
          : t('generic.error', 'Unknown error')
      return <ErrorComponent message={message} />
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
              <StoreLogos runner={runner} />
            </div>
            <div className="gameInfo">
              <div className="titleWrapper">
                <h1 className="title">{title}</h1>
                <div className="game-actions">
                  <button className="toggle">
                    <FontAwesomeIcon icon={faEllipsisV} />
                  </button>

                  <GameSubMenu
                    appName={appName}
                    isInstalled={is_installed}
                    title={title}
                    storeUrl={gameInfo.store_url}
                    runner={gameInfo.runner}
                    handleUpdate={handleUpdate}
                    disableUpdate={updateRequested || isUpdating}
                    onShowRequirements={
                      hasRequirements
                        ? () => setShowRequirements(true)
                        : undefined
                    }
                  />
                </div>
              </div>
              <div className="infoWrapper">
                <div className="developer">{developer}</div>
                <div className="summary">
                  {extra && extra.about
                    ? extra.about.description
                      ? extra.about.description
                      : extra.about.longDescription
                      ? extra.about.longDescription
                      : ''
                    : ''}
                </div>
                {is_installed && showCloudSaveInfo && (
                  <div
                    style={{
                      color: autoSyncSaves ? '#07C5EF' : ''
                    }}
                  >
                    <b>{t('info.syncsaves')}:</b>{' '}
                    {autoSyncSaves ? t('enabled') : t('disabled')}
                  </div>
                )}
                {is_installed && !showCloudSaveInfo && (
                  <div
                    style={{
                      color: '#F45460'
                    }}
                  >
                    <b>{t('info.syncsaves')}:</b>{' '}
                    {t('cloud_save_unsupported', 'Unsupported')}
                  </div>
                )}
                {!is_installed && !isSideloaded && (
                  <>
                    <div>
                      <b>{t('game.downloadSize', 'Download Size')}:</b>{' '}
                      {downloadSize ?? '...'}
                    </div>
                    <div>
                      <b>{t('game.installSize', 'Install Size')}:</b>{' '}
                      {installSize ?? '...'}
                    </div>
                    <br />
                  </>
                )}
                {is_installed && (
                  <>
                    {!isSideloaded && (
                      <div>
                        <b>{t('info.size')}:</b> {install_size}
                      </div>
                    )}
                    <div style={{ textTransform: 'capitalize' }}>
                      <b>
                        {t('info.installedPlatform', 'Installed Platform')}:
                      </b>{' '}
                      {installPlatform === 'osx' ? 'MacOS' : installPlatform}
                    </div>
                    {!isSideloaded && (
                      <div>
                        <b>{t('info.version')}:</b> {version}
                      </div>
                    )}
                    <div>
                      <b>{t('info.canRunOffline', 'Online Required')}:</b>{' '}
                      {t(canRunOffline ? 'box.no' : 'box.yes')}
                    </div>
                    <div
                      className="clickable"
                      onClick={() =>
                        appLocation !== undefined
                          ? window.api.openFolder(appLocation)
                          : {}
                      }
                    >
                      <b>{t('info.path')}:</b> {appLocation}
                    </div>
                    {isLinux && !isNative && (
                      <>
                        <div>
                          <b>Wine:</b> {wineVersion}
                        </div>
                        <div
                          className="clickable"
                          onClick={() => window.api.openFolder(winePrefix)}
                        >
                          <b>Prefix:</b> {winePrefix}
                        </div>
                      </>
                    )}
                    <br />
                  </>
                )}
              </div>
              <TimeContainer game={appName} />
              <div className="gameStatus">
                {isInstalling ||
                  (isUpdating && (
                    <progress
                      className="installProgress"
                      max={100}
                      value={getProgress(progress)}
                    />
                  ))}
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
              {is_installed && Boolean(launchOptions.length) && (
                <SelectField
                  htmlId="launch_options"
                  onChange={(event) => setLaunchArguments(event.target.value)}
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
              <Anticheat gameInfo={gameInfo} />
              <div className="buttonsWrapper">
                {is_installed && (
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
                  to={`/settings/${runner}/${appName}/log`}
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
                    {t('report_problem', 'Report a problem running this game')}
                  </>
                </NavLink>
              )}
            </div>

            {hasRequirements && showRequirements && (
              <Dialog
                showCloseButton
                onClose={() => setShowRequirements(false)}
              >
                <DialogHeader onClose={() => setShowRequirements(false)}>
                  <div>{t('game.requirements', 'Requirements')}</div>
                </DialogHeader>
                <DialogContent>
                  <GameRequirements gameInfo={gameInfo} />
                </DialogContent>
              </Dialog>
            )}
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
      return `${t('status.reparing')} ${percent ? `${percent}%` : '...'}`
    }

    if (isMoving) {
      return `${t('status.moving')}`
    }

    const currentProgress =
      getProgress(progress) >= 99
        ? ''
        : `${
            percent && bytes
              ? `${percent}% [${bytes}] ${eta ? `ETA: ${eta}` : ''}`
              : '...'
          }`

    if (isUpdating && is_installed) {
      if (!currentProgress) {
        return `${t('status.processing', 'Processing files, please wait')}...`
      }
      if (eta && eta.includes('verifying')) {
        return `${t('status.reparing')}: ${percent} [${bytes}]`
      }
      return `${t('status.updating')} ${currentProgress}`
    }

    if (!isUpdating && isInstalling) {
      if (!currentProgress) {
        return `${t('status.processing', 'Processing files, please wait')}...`
      }
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

  async function doAutoSyncSaves() {
    setIsSyncing(true)
    if (gameInfo.runner === 'legendary') {
      await syncSaves(savesPath, appName, gameInfo.runner)
    } else if (gameInfo.runner === 'gog') {
      await window.api.syncGOGSaves(gogSaves, appName, '')
    }
    setIsSyncing(false)
  }

  function handlePlay() {
    return async () => {
      if (status === 'playing' || status === 'updating') {
        return sendKill(appName, gameInfo.runner)
      }

      if (autoSyncSaves) {
        await doAutoSyncSaves()
      }
      await launch({
        appName,
        t,
        launchArguments,
        runner: gameInfo.runner,
        hasUpdate,
        showDialogModal
      })

      if (autoSyncSaves) {
        await doAutoSyncSaves()
      }
    }
  }

  async function handleInstall(is_installed: boolean) {
    if (!is_installed && !isInstalling) {
      return handleModal()
    }

    const gameStatus: GameStatus = libraryStatus.filter(
      (game: GameStatus) => game.appName === appName
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
      showDialogModal: showDialogModal
    })
  }
}
