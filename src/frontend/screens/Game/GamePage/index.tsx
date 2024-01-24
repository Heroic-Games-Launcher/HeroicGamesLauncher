import './index.scss'

import React, { useContext, useEffect, useState } from 'react'

import {
  ArrowCircleLeft,
  ArrowBackIosNew,
  Info,
  Star,
  Monitor
} from '@mui/icons-material'
import {
  getGameInfo,
  getInstallInfo,
  launch,
  sendKill,
  updateGame
} from 'frontend/helpers'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { CachedImage, UpdateComponent } from 'frontend/components/UI'

import {
  ExtraInfo,
  GameInfo,
  Runner,
  WikiInfo,
  InstallInfo,
  LaunchOption
} from 'common/types'

import GamePicture from '../GamePicture'
import TimeContainer from '../TimeContainer'

import { InstallModal } from 'frontend/screens/Library/components'
import { install } from 'frontend/helpers/library'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ErrorComponent from 'frontend/components/UI/ErrorComponent'
import Anticheat from 'frontend/components/UI/Anticheat'

import StoreLogos from 'frontend/components/UI/StoreLogos'
import { hasStatus } from 'frontend/hooks/hasStatus'
import GameContext from '../GameContext'
import { GameContextType } from 'frontend/types'
import {
  AppleWikiInfo,
  CloudSavesSync,
  CompatibilityInfo,
  Description,
  Developer,
  DotsMenu,
  DownloadSizeInfo,
  GameStatus,
  HLTB,
  InstalledInfo,
  LaunchOptions,
  MainButton,
  ReportIssue,
  Requirements,
  Scores,
  SettingsButton
} from './components'
import { hasAnticheatInfo } from 'frontend/hooks/hasAnticheatInfo'
import { hasHelp } from 'frontend/hooks/hasHelp'
import Genres from './components/Genres'
import ReleaseDate from './components/ReleaseDate'
import { useGlobalConfig } from 'frontend/hooks/config'

export default React.memo(function GamePage(): JSX.Element | null {
  const { appName, runner } = useParams() as { appName: string; runner: Runner }
  const location = useLocation() as {
    state: { fromDM: boolean; gameInfo: GameInfo }
  }
  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const { gameInfo: locationGameInfo } = location.state

  const [showModal, setShowModal] = useState({ game: '', show: false })
  const [wikiInfo, setWikiInfo] = useState<WikiInfo | null>(null)

  const {
    epic,
    gog,
    gameUpdates,
    platform,
    showDialogModal,
    isSettingsModalOpen,
    connectivity
  } = useContext(ContextProvider)
  const [enableNewDesign] = useGlobalConfig('enableNewDesign')

  hasHelp(
    'gamePage',
    t('help.title.gamePage', 'Game Page'),
    <p>
      {t(
        'help.content.gamePage',
        'Show all game details and actions. Use the 3 dots menu for more options.'
      )}
    </p>
  )

  const [gameInfo, setGameInfo] = useState(locationGameInfo)

  const { status, folder, statusContext } = hasStatus(appName, gameInfo)
  const gameAvailable = gameInfo.is_installed && status !== 'notAvailable'

  const [progress, previousProgress] = hasProgress(appName)

  const [extraInfo, setExtraInfo] = useState<ExtraInfo | null>(null)
  const [gameInstallInfo, setGameInstallInfo] = useState<InstallInfo | null>(
    null
  )
  const [launchArguments, setLaunchArguments] = useState<
    LaunchOption | undefined
  >(undefined)
  const [hasError, setHasError] = useState<{
    error: boolean
    message: string | unknown
  }>({ error: false, message: '' })

  const anticheatInfo = hasAnticheatInfo(gameInfo)

  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isSideloaded = runner === 'sideload'
  const isBrowserGame = gameInfo?.install.platform === 'Browser'

  const isInstalling = status === 'installing'
  const isPlaying = status === 'playing'
  const isUpdating = status === 'updating'
  const isQueued = status === 'queued'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isUninstalling = status === 'uninstalling'
  const isSyncing = status === 'syncing-saves'
  const isLaunching = status === 'launching'
  const isInstallingWinetricksPackages = status === 'winetricks'
  const isInstallingRedist = status === 'redist'
  const notAvailable = !gameAvailable && gameInfo.is_installed
  const notInstallable =
    gameInfo.installable !== undefined && !gameInfo.installable
  const notSupportedGame =
    gameInfo.runner !== 'sideload' && gameInfo.thirdPartyManagedApp === 'Origin'
  const isOffline = connectivity.status !== 'online'

  const backRoute = location.state?.fromDM ? '/download-manager' : '/library'

  const storage: Storage = window.localStorage

  const [tab, setTab] = useState<'info' | 'extra' | 'requirements'>('info')

  useEffect(() => {
    const updateGameInfo = async () => {
      if (status) {
        const newInfo = await getGameInfo(appName, runner)
        if (newInfo) {
          setGameInfo(newInfo)
        }
        setExtraInfo(await window.api.getExtraInfo(appName, runner))
      }
    }
    updateGameInfo()
  }, [status, gog.library, epic.library, isMoving])

  useEffect(() => {
    const updateConfig = async () => {
      if (gameInfo && status) {
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

        if (
          runner !== 'sideload' &&
          !notSupportedGame &&
          !notInstallable &&
          !isOffline
        ) {
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
      }
    }
    updateConfig()
  }, [
    status,
    epic.library,
    gog.library,
    gameInfo,
    isSettingsModalOpen,
    isOffline
  ])

  useEffect(() => {
    window.api
      .getWikiGameInfo(gameInfo.title, appName, runner)
      .then((info: WikiInfo) => {
        if (
          info &&
          (info.applegamingwiki || info.howlongtobeat || info.pcgamingwiki)
        ) {
          setWikiInfo(info)
        }
      })
  }, [appName])

  function handleUpdate() {
    if (gameInfo.runner !== 'sideload')
      updateGame({ appName, runner, gameInfo })
  }

  function handleModal() {
    setShowModal({ game: appName, show: true })
  }

  let hasUpdate = false

  if (gameInfo && gameInfo.install) {
    const {
      runner,
      title,
      art_square,
      art_cover,
      art_background,
      art_logo,
      install: { platform: installPlatform },
      is_installed
    } = gameInfo

    hasUpdate = is_installed && gameUpdates?.includes(appName)

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

    const isMacNative = ['osx', 'Mac'].includes(installPlatform ?? '')
    const isLinuxNative = installPlatform === 'linux'

    // create setting context functions
    const contextValues: GameContextType = {
      appName,
      gameInfo,
      runner,
      gameInstallInfo,
      gameExtraInfo: extraInfo,
      is: {
        installing: isInstalling,
        installingWinetricksPackages: isInstallingWinetricksPackages,
        installingRedist: isInstallingRedist,
        launching: isLaunching,
        linux: isLinux,
        linuxNative: isLinuxNative,
        mac: isMac,
        macNative: isMacNative,
        moving: isMoving,
        native: isWin || isMacNative || isLinuxNative,
        notAvailable,
        notInstallable,
        notSupportedGame,
        playing: isPlaying,
        queued: isQueued,
        reparing: isReparing,
        sideloaded: isSideloaded,
        syncing: isSyncing,
        uninstalling: isUninstalling,
        updating: isUpdating,
        win: isWin
      },
      statusContext,
      status,
      wikiInfo
    }

    const hasWikiInfo =
      wikiInfo?.applegamingwiki ||
      wikiInfo?.howlongtobeat ||
      wikiInfo?.pcgamingwiki?.metacritic.score ||
      wikiInfo?.pcgamingwiki?.opencritic.score ||
      wikiInfo?.steamInfo

    const hasRequirements = extraInfo ? extraInfo.reqs.length > 0 : false

    return (
      <div className="gameConfigContainer">
        {!!(art_background ?? art_cover) && enableNewDesign && (
          <CachedImage
            src={art_background || art_cover}
            className="backgroundImage"
          />
        )}
        {gameInfo.runner !== 'sideload' && showModal.show && (
          <InstallModal
            appName={showModal.game}
            runner={runner}
            backdropClick={() => setShowModal({ game: '', show: false })}
            gameInfo={gameInfo}
          />
        )}
        {title ? (
          <GameContext.Provider value={contextValues}>
            {/* OLD DESIGN */}
            {!enableNewDesign && (
              <>
                <GamePicture
                  art_square={art_square}
                  art_logo={art_logo}
                  store={runner}
                />
                <NavLink
                  className="backButton"
                  to={backRoute}
                  title={t2('webview.controls.back', 'Go Back')}
                >
                  <ArrowCircleLeft />
                </NavLink>
                <div className="store-icon">
                  <StoreLogos runner={runner} />
                </div>
                <div className="gameInfo">
                  <div className="titleWrapper">
                    <h1 className="title">{title}</h1>
                    {!isBrowserGame && <SettingsButton gameInfo={gameInfo} />}
                    <DotsMenu gameInfo={gameInfo} handleUpdate={handleUpdate} />
                  </div>
                  <div className="infoWrapper">
                    <Genres genres={wikiInfo?.pcgamingwiki?.genres || []} />
                    <Developer gameInfo={gameInfo} />
                    <ReleaseDate
                      runnerDate={extraInfo?.releaseDate}
                      date={wikiInfo?.pcgamingwiki?.releaseDate}
                    />
                    <Description />
                    <CloudSavesSync gameInfo={gameInfo} />
                    <DownloadSizeInfo gameInfo={gameInfo} />
                    <InstalledInfo gameInfo={gameInfo} />
                    <Scores gameInfo={gameInfo} />
                    <HLTB />
                    <CompatibilityInfo gameInfo={gameInfo} />
                    <AppleWikiInfo gameInfo={gameInfo} />
                    <Requirements />
                  </div>
                  {!notInstallable && (
                    <TimeContainer runner={runner} game={appName} />
                  )}
                  <GameStatus
                    gameInfo={gameInfo}
                    progress={progress}
                    handleUpdate={handleUpdate}
                    hasUpdate={hasUpdate}
                  />
                  <LaunchOptions
                    gameInfo={gameInfo}
                    setLaunchArguments={setLaunchArguments}
                  />

                  <Anticheat anticheatInfo={anticheatInfo} />
                  <MainButton
                    gameInfo={gameInfo}
                    handlePlay={handlePlay}
                    handleInstall={handleInstall}
                  />
                  <ReportIssue gameInfo={gameInfo} />
                </div>
              </>
            )}
            {/* NEW DESIGN */}
            {enableNewDesign && (
              <>
                <div className="mainInfoWrapper">
                  <NavLink
                    className="backButton"
                    to={backRoute}
                    title={t2('webview.controls.back', 'Go Back')}
                  >
                    <ArrowBackIosNew />
                  </NavLink>

                  <DotsMenu gameInfo={gameInfo} handleUpdate={handleUpdate} />
                  {!isBrowserGame && <SettingsButton gameInfo={gameInfo} />}
                  <div className="mainInfo">
                    <GamePicture
                      art_square={art_cover}
                      art_logo={art_logo}
                      store={runner}
                    />
                    <div className="store-icon">
                      <StoreLogos runner={runner} />
                    </div>
                    <h1>{title}</h1>
                    <Genres genres={wikiInfo?.pcgamingwiki?.genres || []} />
                    <Developer gameInfo={gameInfo} />
                    <ReleaseDate
                      runnerDate={extraInfo?.releaseDate}
                      date={wikiInfo?.pcgamingwiki?.releaseDate}
                    />
                    <Description />
                    {!notInstallable && (
                      <TimeContainer runner={runner} game={appName} />
                    )}
                    <GameStatus
                      gameInfo={gameInfo}
                      progress={progress}
                      handleUpdate={handleUpdate}
                      hasUpdate={hasUpdate}
                    />
                    <LaunchOptions
                      gameInfo={gameInfo}
                      setLaunchArguments={setLaunchArguments}
                    />
                    <div className="buttons">
                      <MainButton
                        gameInfo={gameInfo}
                        handlePlay={handlePlay}
                        handleInstall={handleInstall}
                      />
                      {gameInfo.is_installed && <button>Uninstall</button>}
                    </div>
                  </div>
                  <ReportIssue gameInfo={gameInfo} />
                </div>
                <div className="extraInfoWrapper">
                  <div className="tabs">
                    <button
                      title="Install Info"
                      className="showInfo"
                      onClick={() => setTab('info')}
                    >
                      <Info />
                    </button>
                    {hasWikiInfo && (
                      <button
                        title="Extra Info"
                        className="showExtra"
                        onClick={() => setTab('extra')}
                      >
                        <Star />
                      </button>
                    )}
                    {hasRequirements && (
                      <button
                        title="Requirements"
                        className="showRequirements"
                        onClick={() => setTab('requirements')}
                      >
                        <Monitor />
                      </button>
                    )}
                  </div>

                  <div className={`tabContent ${tab}Tab`}>
                    <div>
                      {tab === 'info' && (
                        <>
                          <DownloadSizeInfo gameInfo={gameInfo} />
                          <InstalledInfo gameInfo={gameInfo} />
                          <CloudSavesSync gameInfo={gameInfo} />
                        </>
                      )}
                      {tab === 'extra' && (
                        <>
                          <Scores gameInfo={gameInfo} />
                          <HLTB />
                          <CompatibilityInfo gameInfo={gameInfo} />
                          <AppleWikiInfo gameInfo={gameInfo} />
                        </>
                      )}
                      {tab === 'requirements' && <Requirements />}
                    </div>
                  </div>

                  <Anticheat anticheatInfo={anticheatInfo} />
                </div>
              </>
            )}
          </GameContext.Provider>
        ) : (
          <UpdateComponent />
        )}
      </div>
    )
  }
  return <UpdateComponent />

  async function handlePlay(gameInfo: GameInfo) {
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
