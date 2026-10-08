import './index.css'

import React, { useContext, useEffect, useRef, useState } from 'react'

import { Info } from 'lucide-react'

import { getGameInfo, getInstallInfo, sendKill } from 'frontend/helpers'
import { launch, updateGame, install } from 'frontend/helpers/library'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  BackButton,
  CachedImage,
  Panel,
  TabPanel,
  Tabs,
  UpdateComponent
} from 'frontend/components/UI'
import type { TabItem } from 'frontend/components/UI/Tabs'

import {
  ExtraInfo,
  GameInfo,
  GameSettings,
  Runner,
  WikiInfo,
  InstallInfo,
  GameAchievement
} from 'common/types'

import { hasProgress } from 'frontend/hooks/hasProgress'
import ErrorComponent from 'frontend/components/UI/ErrorComponent'
import Anticheat from 'frontend/components/UI/Anticheat'

import { hasStatus } from 'frontend/hooks/hasStatus'
import GameContext from '../GameContext'
import { GameContextType } from 'frontend/types'
import {
  Achievements,
  CloudSavesSync,
  CompatibilityInfo,
  Description,
  DownloadSizeInfo,
  GameActions,
  GameDetails,
  GameStats,
  GameStatus,
  Genres,
  HLTB,
  InstalledInfo,
  ReportIssue,
  Requirements,
  Scores
} from './components'
import { hasAnticheatInfo } from 'frontend/hooks/hasAnticheatInfo'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { useKnownFixes } from 'frontend/hooks/hasKnownFixes'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'
import useGlobalState from 'frontend/state/GlobalStateV2'
import { LaunchOptionSelector } from 'frontend/screens/Settings/components'

type GameTab = 'overview' | 'info' | 'achievements' | 'extra' | 'requirements'

export default React.memo(function GamePage(): JSX.Element | null {
  const { appName, runner } = useParams() as { appName: string; runner: Runner }
  const location = useLocation() as {
    state: { fromDM: boolean; gameInfo: GameInfo }
  }
  const { t, i18n } = useTranslation('gamepage')

  const { gameInfo: locationGameInfo } = location.state

  const [wikiInfo, setWikiInfo] = useState<WikiInfo | null>(null)

  const { epic, gog, gameUpdates, platform, showDialogModal, connectivity } =
    useContext(ContextProvider)

  const { settingsModalProps } = useGlobalState.keys('settingsModalProps')

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
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null)

  const { status, folder, statusContext } = hasStatus(gameInfo)
  const gameAvailable = gameInfo.is_installed && status !== 'notAvailable'

  const [progress, previousProgress] = hasProgress(appName, runner)

  const [extraInfo, setExtraInfo] = useState<ExtraInfo | null>(
    gameInfo.extra || null
  )
  const [achievements, setAchievements] = useState<GameAchievement[]>([])
  const hasAchievements = achievements && achievements.length > 0
  const achievementPercentage = hasAchievements
    ? Math.round(
        (achievements.filter((x) => x.date_unlocked).length /
          achievements.length) *
          100
      )
    : 0

  const [notInstallable, setNotInstallable] = useState<boolean>(false)
  const [gameInstallInfo, setGameInstallInfo] = useState<InstallInfo | null>(
    null
  )

  const [hasError, setHasError] = useState<{
    error: boolean
    message: unknown
  }>({ error: false, message: '' })
  const [playClicked, setPlayClicked] = useState(false)

  const anticheatInfo = hasAnticheatInfo(gameInfo)

  const knownFixes = useKnownFixes(appName, runner)

  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isSideloaded = runner === 'sideload'

  const isInstalling = status === 'installing'
  const isImporting = status === 'importing'
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
  const notSupportedGame =
    gameInfo.runner !== 'sideload' &&
    !!gameInfo.thirdPartyManagedApp &&
    !gameInfo.isEAManaged &&
    !gameInfo.isUbisoftManaged
  const isOffline = connectivity.status !== 'online'
  const notPlayableOffline = isOffline && !gameInfo.canRunOffline

  const backRoute = location.state?.fromDM ? '/download-manager' : '/library'

  const storage: Storage = window.localStorage

  const [currentTab, setCurrentTab] = useState<GameTab>('overview')

  const previousIsPlaying = useRef<boolean>(isPlaying)
  useEffect(() => {
    const updateAchievements = async () => {
      if (!isPlaying && previousIsPlaying.current)
        window.api.clearAchievementCache(appName)
      setAchievements(await window.api.getAchievements(appName, runner))
    }

    updateAchievements()
    previousIsPlaying.current = isPlaying
  }, [isPlaying, appName])

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
          thirdPartyManagedApp,
          is_mac_native = undefined
        } = { ...gameInfo }

        const installPlatform =
          install.platform || (is_mac_native && isMac ? 'Mac' : 'Windows')

        if (
          runner !== 'sideload' &&
          !notSupportedGame &&
          !notInstallable &&
          !thirdPartyManagedApp &&
          !isOffline
        ) {
          getInstallInfo(appName, runner, installPlatform)
            .then((info) => {
              if (!info) {
                throw new Error('Cannot get game info')
              }
              if (
                info.manifest &&
                info.manifest.disk_size === 0 &&
                info.manifest.download_size === 0
              ) {
                setNotInstallable(true)
                return
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
  }, [
    status,
    epic.library,
    gog.library,
    gameInfo,
    settingsModalProps.isOpen,
    isOffline
  ])

  useEffect(() => {
    window.api.getWikiGameInfo(gameInfo.title, appName, runner).then((info) => {
      if (
        info &&
        (info.applegamingwiki || info.howlongtobeat || info.pcgamingwiki)
      ) {
        setWikiInfo(info)
      }
    })
  }, [appName])

  useEffect(() => {
    // when the user clicks the Play button, we disable it so the user can't click it again
    // once we receive the "launching" status update we can safely unset this state
    if (status === 'launching') setPlayClicked(false)
  }, [status])

  function handleUpdate() {
    if (gameInfo.runner !== 'sideload')
      updateGame({ appName, runner, gameInfo })
  }

  function handleModal() {
    openInstallGameModal({ appName, runner, gameInfo })
  }

  let hasUpdate = false

  const settingsContextValues = useSettingsContext({
    appName,
    gameInfo,
    runner
  })

  if (gameInfo && gameInfo.install && settingsContextValues) {
    const {
      runner,
      art_background,
      install: { platform: installPlatform },
      is_installed
    } = gameInfo
    const title = gameInfo.overrides?.title || gameInfo.title
    const art_cover = gameInfo.overrides?.art_cover || gameInfo.art_cover

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
    const isLinuxNative = ['linux', 'Linux'].includes(installPlatform ?? '')

    const contextValues: GameContextType = {
      appName,
      gameInfo,
      runner,
      gameSettings,
      gameInstallInfo,
      gameExtraInfo: extraInfo,
      is: {
        installing: isInstalling,
        importing: isImporting,
        installingWinetricksPackages: isInstallingWinetricksPackages,
        installingRedist: isInstallingRedist,
        launching: isLaunching || playClicked,
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
        win: isWin,
        notPlayableOffline: notPlayableOffline
      },
      statusContext,
      status,
      wikiInfo
    }

    const hasExtraInfo =
      wikiInfo?.howlongtobeat || wikiInfo?.steamInfo?.compatibilityLevel

    const hasRequirements = extraInfo ? extraInfo.reqs.length > 0 : false

    const tabs: TabItem<GameTab>[] = [
      { value: 'overview', label: t('game.overview', 'Overview') },
      {
        value: 'info',
        label: t('game.install_info', 'Installation Info')
      }
    ]

    if (hasAchievements) {
      tabs.push({
        value: 'achievements',
        label: `${t('game.achievements', 'Achievements')} · ${achievementPercentage}%`
      })
    }

    if (hasExtraInfo) {
      tabs.push({ value: 'extra', label: t('game.extra_info', 'Extra') })
    }

    if (hasRequirements) {
      tabs.push({
        value: 'requirements',
        label: t('game.requirements', 'System Requirements')
      })
    }

    const activeTab = tabs.some((tab) => tab.value === currentTab)
      ? currentTab
      : 'overview'

    let wikiLink = <></>
    if (knownFixes && knownFixes.wikiLink) {
      wikiLink = (
        <p className="wikiLink">
          <Info />
          <span>
            <Trans key="wikiLink" i18n={i18n}>
              Important information about this game, read this:&nbsp;
              <Link to={knownFixes.wikiLink}>Open page</Link>
            </Trans>
          </span>
        </p>
      )
    }

    if (!title) {
      return <UpdateComponent />
    }

    return (
      <SettingsContext.Provider value={settingsContextValues}>
        <GameContext.Provider value={contextValues}>
          <div className="gameConfigContainer">
            {!!(art_background ?? art_cover) && (
              <CachedImage
                src={art_background || art_cover}
                className="backgroundImage"
              />
            )}
            <div className="gamePage__scrim" />

            <div className="topRowWrapper">
              <BackButton
                to={backRoute}
                label={t('button.backToLibrary', 'Back to Library')}
              />
            </div>

            <div className="gamePage__content">
              <Panel tone="glass" padding="lg" className="gamePage__hero">
                <div className="gamePage__heroMain">
                  <h1 className="gamePage__title">{title}</h1>
                  <div className="gamePage__meta">
                    <Genres
                      genres={
                        extraInfo?.genres ||
                        wikiInfo?.pcgamingwiki?.genres ||
                        []
                      }
                    />
                  </div>

                  <GameActions
                    gameInfo={gameInfo}
                    handlePlay={handlePlay}
                    handleInstall={handleInstall}
                    handleUpdate={handleUpdate}
                  />

                  <GameStatus
                    gameInfo={gameInfo}
                    progress={progress}
                    handleUpdate={handleUpdate}
                    hasUpdate={hasUpdate}
                  />
                  <LaunchOptionSelector showTitle={false} />
                  {wikiLink}
                </div>

                <div className="gamePage__heroAside">
                  {!notInstallable && <GameStats gameInfo={gameInfo} />}
                  <Scores gameInfo={gameInfo} />
                </div>
              </Panel>

              <Panel tone="glass" padding="lg" className="gamePage__tabs">
                <Tabs
                  items={tabs}
                  value={activeTab}
                  onChange={setCurrentTab}
                  aria-label={t('game.tabs', 'Game information')}
                />

                <TabPanel
                  value={activeTab}
                  index="overview"
                  className="overviewTab"
                >
                  <div className="overviewTab__main">
                    <Description />
                    <ReportIssue gameInfo={gameInfo} />
                  </div>
                  <GameDetails gameInfo={gameInfo} />
                </TabPanel>

                <TabPanel value={activeTab} index="info" className="infoTab">
                  <DownloadSizeInfo gameInfo={gameInfo} />
                  <InstalledInfo gameInfo={gameInfo} />
                  <CloudSavesSync gameInfo={gameInfo} />
                </TabPanel>

                <TabPanel
                  value={activeTab}
                  index="achievements"
                  className="achievementsTab"
                >
                  <Achievements achievements={achievements} />
                </TabPanel>

                <TabPanel value={activeTab} index="extra" className="extraTab">
                  <HLTB />
                  <CompatibilityInfo gameInfo={gameInfo} />
                </TabPanel>

                <TabPanel
                  value={activeTab}
                  index="requirements"
                  className="requirementsTab"
                >
                  <Requirements />
                </TabPanel>
              </Panel>

              <Anticheat anticheatInfo={anticheatInfo} />
            </div>
          </div>
        </GameContext.Provider>
      </SettingsContext.Provider>
    )
  }
  return <UpdateComponent />

  async function handlePlay(gameInfo: GameInfo) {
    if (isPlaying || isUpdating) {
      return sendKill(appName, gameInfo.runner)
    }

    setPlayClicked(true)
    await launch({
      appName,
      t,
      runner: gameInfo.runner,
      hasUpdate,
      showDialogModal,
      notPlayableOffline
    })
    setPlayClicked(false)
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
