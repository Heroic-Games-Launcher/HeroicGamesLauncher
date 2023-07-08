import './index.scss'

import React, { useContext, useEffect, useState } from 'react'

import ArrowCircleLeftIcon from '@mui/icons-material/ArrowCircleLeft'
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
import { UpdateComponent } from 'frontend/components/UI'

import {
  ExtraInfo,
  GameInfo,
  GameSettings,
  Runner,
  WikiInfo
} from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'

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
    isSettingsModalOpen
  } = useContext(ContextProvider)

  const [gameInfo, setGameInfo] = useState(locationGameInfo)
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)

  const { status, folder } = hasStatus(appName, gameInfo)
  const gameAvailable = gameInfo.is_installed && status !== 'notAvailable'

  const [progress, previousProgress] = hasProgress(appName)

  const [extraInfo, setExtraInfo] = useState<ExtraInfo | null>(null)
  const [gameInstallInfo, setGameInstallInfo] = useState<
    LegendaryInstallInfo | GogInstallInfo | null
  >(null)
  const [launchArguments, setLaunchArguments] = useState('')
  const [hasError, setHasError] = useState<{
    error: boolean
    message: string | unknown
  }>({ error: false, message: '' })

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
  const isLaunching = status === 'launching'
  const isInstallingUbisoft = status === 'ubisoft'
  const notAvailable = !gameAvailable && gameInfo.is_installed
  const notInstallable =
    gameInfo.installable !== undefined && !gameInfo.installable
  const notSupportedGame =
    gameInfo.runner !== 'sideload' && gameInfo.thirdPartyManagedApp === 'Origin'

  const backRoute = location.state?.fromDM ? '/download-manager' : '/library'

  const storage: Storage = window.localStorage

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

        if (runner !== 'sideload' && !notSupportedGame && !notInstallable) {
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
          const gameSettings = await window.api.requestGameSettings(appName)
          setGameSettings(gameSettings)
        } catch (error) {
          setHasError({ error: true, message: error })
          window.api.logError(`${error}`)
        }
      }
    }
    updateConfig()
  }, [status, epic.library, gog.library, gameInfo, isSettingsModalOpen])

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
      gameSettings,
      gameInstallInfo,
      gameExtraInfo: extraInfo,
      is: {
        installing: isInstalling,
        installingUbisoft: isInstallingUbisoft,
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
      status,
      wikiInfo
    }

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
          <GameContext.Provider value={contextValues}>
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
                <SettingsButton gameInfo={gameInfo} />
                <DotsMenu gameInfo={gameInfo} handleUpdate={handleUpdate} />
              </div>
              <div className="infoWrapper">
                <Developer gameInfo={gameInfo} />
                <Description />
                <CloudSavesSync gameInfo={gameInfo} />
                <DownloadSizeInfo gameInfo={gameInfo} />
                <InstalledInfo gameInfo={gameInfo} />
                <Scores gameInfo={gameInfo} />
                <HLTB />
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
                launchArguments={launchArguments}
                setLaunchArguments={setLaunchArguments}
              />

              <Anticheat gameInfo={gameInfo} />
              <MainButton
                gameInfo={gameInfo}
                handlePlay={handlePlay}
                handleInstall={handleInstall}
              />
              <ReportIssue gameInfo={gameInfo} />
            </div>
          </GameContext.Provider>
        ) : (
          <UpdateComponent />
        )}
      </div>
    )
  }
  return <UpdateComponent />

  function handlePlay(gameInfo: GameInfo) {
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
