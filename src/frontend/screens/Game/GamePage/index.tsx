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
  updateGame
} from 'frontend/helpers'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { UpdateComponent, SelectField, SvgButton } from 'frontend/components/UI'
import { ReactComponent as SettingsIcoAlt } from 'frontend/assets/settings_icon_alt.svg'

import {
  ExtraInfo,
  GameInfo,
  Runner,
  SideloadGame,
  WineInstallation
} from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'

import GamePicture from '../GamePicture'
import TimeContainer from '../TimeContainer'

import GameRequirements from '../GameRequirements'
import { GameSubMenu } from '..'
import { InstallModal } from 'frontend/screens/Library/components'
import { install } from 'frontend/helpers/library'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTriangleExclamation,
  faEllipsisV,
  faCircleInfo
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
import { WikiGameInfo } from 'frontend/components/UI/WikiGameInfo'
import classNames from 'classnames'
import { hasStatus } from 'frontend/hooks/hasStatus'

export default React.memo(function GamePage(): JSX.Element | null {
  const { appName, runner } = useParams() as { appName: string; runner: Runner }
  const location = useLocation() as {
    state: { fromDM: boolean; gameInfo: GameInfo | SideloadGame }
  }
  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const { gameInfo: locationGameInfo } = location.state

  const [showModal, setShowModal] = useState({ game: '', show: false })

  const {
    epic,
    gog,
    gameUpdates,
    platform,
    showDialogModal,
    setIsSettingsModalOpen,
    isSettingsModalOpen
  } = useContext(ContextProvider)

  const [gameInfo, setGameInfo] = useState(locationGameInfo)

  const { status, folder } = hasStatus(appName, gameInfo)
  const gameAvailable = gameInfo.is_installed && status !== 'notAvailable'

  const [progress, previousProgress] = hasProgress(appName)

  const [extraInfo, setExtraInfo] = useState<ExtraInfo | null>(null)
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [gameInstallInfo, setGameInstallInfo] = useState<
    LegendaryInstallInfo | GogInstallInfo | null
  >(null)
  const [launchArguments, setLaunchArguments] = useState('')
  const [hasError, setHasError] = useState<{
    error: boolean
    message: string | unknown
  }>({ error: false, message: '' })
  const [winePrefix, setWinePrefix] = useState('')
  const [wineVersion, setWineVersion] = useState<WineInstallation>()
  const [showRequirements, setShowRequirements] = useState(false)
  const [showExtraInfo, setShowExtraInfo] = useState(false)

  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isSideloaded = runner === 'sideload'

  const isInstalling = status === 'installing'
  const isPlaying = status === 'playing'
  const isUpdating = status === 'updating'
  const isQueued = status === 'queued'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isUninstalling = status === 'uninstalling'
  const isSyncing = status === 'syncing-saves'
  const notAvailable = !gameAvailable && gameInfo.is_installed
  const notSupportedGame =
    gameInfo.runner !== 'sideload' && gameInfo.thirdPartyManagedApp === 'Origin'

  const backRoute = location.state?.fromDM ? '/download-manager' : '/library'

  const storage: Storage = window.localStorage

  useEffect(() => {
    const updateGameInfo = async () => {
      const newInfo = await getGameInfo(appName, runner)
      if (newInfo) {
        setGameInfo(newInfo)
      }
      setExtraInfo(await window.api.getExtraInfo(appName, runner))
    }
    updateGameInfo()
  }, [status, gog.library, epic.library, isMoving])

  useEffect(() => {
    const updateConfig = async () => {
      if (gameInfo) {
        const {
          install,
          is_linux_native = undefined,
          is_mac_native = undefined
        } = { ...gameInfo }

        const installPlatform =
          install.platform ||
          (is_linux_native && isLinux
            ? 'linux'
            : is_mac_native && isMac
            ? 'Mac'
            : 'Windows')

        if (runner !== 'sideload' && !notSupportedGame) {
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
            wineVersion,
            winePrefix,
            wineCrossoverBottle
          } = await window.api.requestGameSettings(appName)

          if (!isWin) {
            let wine = wineVersion.name
              .replace('Wine - ', '')
              .replace('Proton - ', '')
            if (wine.includes('Default')) {
              wine = wine.split('-')[0]
            }
            setWineVersion({ ...wineVersion, name: wine })
            setWinePrefix(
              wineVersion.type === 'crossover'
                ? wineCrossoverBottle
                : winePrefix
            )
          }

          if ('cloud_save_enabled' in gameInfo && gameInfo.cloud_save_enabled) {
            setAutoSyncSaves(autoSyncSaves)
            return
          }
        } catch (error) {
          setHasError({ error: true, message: error })
          window.api.logError(`${error}`)
        }
      }
    }
    updateConfig()
  }, [status, epic.library, gog.library, gameInfo, isSettingsModalOpen])

  function handleUpdate() {
    if (gameInfo.runner !== 'sideload')
      updateGame({ appName, runner, gameInfo })
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
      install: { platform: installPlatform },
      is_installed,
      canRunOffline,
      folder_name
    } = gameInfo

    // TODO: Do this in a *somewhat* prettier way
    let install_path: string | undefined
    let install_size: string | undefined
    let version: string | undefined
    let developer: string | undefined
    let cloud_save_enabled = false

    if (gameInfo.runner !== 'sideload') {
      install_path = gameInfo.install.install_path
      install_size = gameInfo.install.install_size
      version = gameInfo.install.version
      developer = gameInfo.developer
      cloud_save_enabled = gameInfo.cloud_save_enabled
    }

    hasRequirements = extraInfo?.reqs ? extraInfo.reqs.length > 0 : false
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

    const description =
      extraInfo?.about.shortDescription ||
      extraInfo?.about.description ||
      t('generic.noDescription', 'No description available')

    return (
      <div className="gameConfigContainer">
        {gameInfo.runner !== 'sideload' && showModal.show && (
          <InstallModal
            appName={showModal.game}
            runner={runner}
            backdropClick={() => setShowModal({ game: '', show: false })}
            gameInfo={gameInfo}
          />
        )}
        {title ? (
          <>
            <GamePicture art_square={art_square} store={runner} />
            <NavLink
              className="backButton"
              to={backRoute}
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
                {is_installed && (
                  <SvgButton
                    onClick={() =>
                      setIsSettingsModalOpen(true, 'settings', gameInfo)
                    }
                    className={`settings-icon`}
                  >
                    <SettingsIcoAlt />
                  </SvgButton>
                )}
                <div className="game-actions">
                  <button className="toggle">
                    <FontAwesomeIcon icon={faEllipsisV} />
                  </button>

                  <GameSubMenu
                    appName={appName}
                    isInstalled={is_installed}
                    title={title}
                    storeUrl={
                      extraInfo?.storeUrl ||
                      ('store_url' in gameInfo ? gameInfo.store_url : '')
                    }
                    runner={gameInfo.runner}
                    handleUpdate={handleUpdate}
                    disableUpdate={isInstalling || isUpdating}
                    setShowExtraInfo={setShowExtraInfo}
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
                <div className="summary">{description}</div>
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
                    <FontAwesomeIcon
                      className="helpIcon"
                      icon={faCircleInfo}
                      title={t(
                        'help.cloud_save_unsupported',
                        'This game does not support cloud saves. This information is provided by the game developers. Some games do implement their own cloud save system'
                      )}
                    />
                  </div>
                )}
                {!is_installed && !isSideloaded && !notSupportedGame && (
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
                    {!isWin && !isNative && (
                      <>
                        <b>Wine:</b> {wineVersion?.name}
                        {wineVersion && wineVersion.type === 'crossover' ? (
                          <div>
                            <b>
                              {t2('setting.winecrossoverbottle', 'Bottle')}:
                            </b>{' '}
                            {winePrefix}
                          </div>
                        ) : (
                          <div
                            className="clickable"
                            onClick={() => window.api.openFolder(winePrefix)}
                          >
                            <b>{t2('setting.wineprefix', 'WinePrefix')}:</b>{' '}
                            {winePrefix}
                          </div>
                        )}
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
                    color: isInstalling
                      ? 'var(--success)'
                      : 'var(--status-warning,  var(--warning))',
                    fontStyle: 'italic'
                  }}
                >
                  {isInstalling && (
                    <Link to={'/download-manager'}>
                      {getInstallLabel(is_installed, notAvailable)}
                    </Link>
                  )}
                  {!isInstalling && getInstallLabel(is_installed, notAvailable)}
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
              {is_installed && !isQueued && (
                <button
                  disabled={
                    isReparing ||
                    isMoving ||
                    isUpdating ||
                    isUninstalling ||
                    isSyncing
                  }
                  autoFocus={true}
                  onClick={handlePlay()}
                  className={classNames('button', {
                    'is-secondary': !is_installed && !isQueued,
                    'is-success':
                      isSyncing ||
                      (!isUpdating &&
                        !isPlaying &&
                        is_installed &&
                        !notAvailable),
                    'is-tertiary':
                      isPlaying ||
                      (!is_installed && isQueued) ||
                      (is_installed && notAvailable),
                    'is-disabled': isUpdating
                  })}
                >
                  {getPlayLabel()}
                </button>
              )}
              {(!is_installed || isQueued) && (
                <button
                  onClick={async () => handleInstall(is_installed)}
                  disabled={
                    isPlaying ||
                    isUpdating ||
                    isReparing ||
                    isMoving ||
                    isUninstalling ||
                    notSupportedGame
                  }
                  autoFocus={true}
                  className={classNames('button', {
                    'is-primary': is_installed,
                    'is-tertiary': notAvailable || isInstalling || isQueued,
                    'is-secondary': !is_installed && !isQueued
                  })}
                >
                  {`${getButtonLabel(is_installed)}`}
                </button>
              )}
              {showExtraInfo && (
                <WikiGameInfo
                  setShouldShow={setShowExtraInfo}
                  title={title}
                  id={runner === 'gog' ? appName : undefined}
                />
              )}
              {is_installed && (
                <span
                  onClick={() => setIsSettingsModalOpen(true, 'log', gameInfo)}
                  className="clickable reportProblem"
                  role={'button'}
                >
                  <>
                    {<FontAwesomeIcon icon={faTriangleExclamation} />}
                    {t('report_problem', 'Report a problem running this game')}
                  </>
                </span>
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
                  <GameRequirements reqs={extraInfo?.reqs} />
                </DialogContent>
              </Dialog>
            )}
            <div id="game-settings"></div>
          </>
        ) : (
          <UpdateComponent />
        )}
      </div>
    )
  }
  return <UpdateComponent />

  function getPlayLabel(): React.ReactNode {
    if (isSyncing) {
      return t('label.saves.syncing')
    }

    return isPlaying ? t('label.playing.stop') : t('label.playing.start')
  }

  function getInstallLabel(
    is_installed: boolean,
    notAvailable?: boolean
  ): React.ReactNode {
    const { eta, bytes, percent, file } = progress

    if (notSupportedGame) {
      return t(
        'status.this-game-uses-third-party',
        'This game uses third party launcher and it is not supported yet'
      )
    }

    if (notAvailable) {
      return t('status.gameNotAvailable', 'Game not available')
    }

    if (isUninstalling) {
      return t('status.uninstalling', 'Uninstalling')
    }

    if (isReparing) {
      return `${t('status.reparing')} ${percent ? `${percent}%` : '...'}`
    }

    if (isMoving) {
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

    if (isQueued) {
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

  function getButtonLabel(is_installed: boolean) {
    if (notSupportedGame) {
      return t('status.notSupported', 'Not supported')
    }
    if (isQueued) {
      return t('button.queue.remove', 'Remove from Queue')
    }
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
      if (isPlaying || isUpdating) {
        return sendKill(appName, gameInfo.runner)
      }

      await launch({
        appName,
        t,
        launchArguments,
        runner: gameInfo.runner,
        hasUpdate,
        showDialogModal
      })
    }
  }

  async function handleInstall(is_installed: boolean) {
    if (isQueued) {
      storage.removeItem(appName)
      return window.api.removeFromDMQueue(appName)
    }

    if (!is_installed && !isInstalling) {
      return handleModal()
    }

    if (!folder) {
      return
    }

    if (gameInfo.runner === 'sideload') return

    return install({
      gameInfo,
      installPath: folder,
      isInstalling,
      previousProgress,
      progress,
      t,
      showDialogModal: showDialogModal
    })
  }
})
