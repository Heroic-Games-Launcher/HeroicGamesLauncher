import './index.css'

import React, {
  useContext,
  CSSProperties,
  useMemo,
  useState,
  useEffect
} from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat, faBan } from '@fortawesome/free-solid-svg-icons'

import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'
import {
  FavouriteGame,
  GameInfo,
  GameStatus,
  HiddenGame,
  Runner
} from 'common/types'
import { Link, useNavigate } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'frontend/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'frontend/assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'frontend/assets/stop-icon-alt.svg'
import {
  getGameInfo,
  getProgress,
  getStoreName,
  install,
  launch,
  sendKill
} from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import { updateGame } from 'frontend/helpers/library'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import ContextMenu, { Item } from '../ContextMenu'
import { hasProgress } from 'frontend/hooks/hasProgress'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'

import classNames from 'classnames'
import StoreLogos from 'frontend/components/UI/StoreLogos'
import UninstallModal from 'frontend/components/UI/UninstallModal'

interface Card {
  buttonClick: () => void
  hasUpdate: boolean
  forceCard?: boolean
  isRecent: boolean
  gameInfo: GameInfo
}

const GameCard = ({
  hasUpdate,
  buttonClick,
  forceCard,
  isRecent = false,
  gameInfo: gameInfoFromProps
}: Card) => {
  const [gameInfo, setGameInfo] = useState(gameInfoFromProps)
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [gameAvailable, setGameAvailable] = useState(
    gameInfoFromProps.is_installed
  )
  const [isLaunching, setIsLaunching] = useState(false)

  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const navigate = useNavigate()

  const {
    libraryStatus,
    layout,
    hiddenGames,
    favouriteGames,
    allTilesInColor,
    showDialogModal
  } = useContext(ContextProvider)

  const {
    title,
    art_square: cover,
    art_logo: logo,
    app_name: appName,
    runner,
    is_installed: isInstalled,
    cloud_save_enabled: hasCloudSave,
    install: gameInstallInfo,
    thirdPartyManagedApp
  } = gameInfoFromProps

  // if the game supports cloud saves, check the config
  const [autoSyncSaves, setAutoSyncSaves] = useState(hasCloudSave)
  useEffect(() => {
    const checkGameConfig = async () => {
      const settings = await window.api.requestGameSettings(appName)
      setAutoSyncSaves(settings.autoSyncSaves)
    }
    if (hasCloudSave) {
      checkGameConfig()
    }
  }, [appName])

  const [progress, previousProgress] = hasProgress(appName)
  const { install_size: size = '0', platform: installedPlatform } =
    gameInstallInfo || {}

  const { status, folder } =
    libraryStatus.find((game: GameStatus) => game.appName === appName) || {}

  useEffect(() => {
    const checkGameAvailable = async () => {
      if (isInstalled) {
        const gameAvailable = await window.api.isGameAvailable({
          appName,
          runner
        })
        setGameAvailable(gameAvailable)
      }
    }
    checkGameAvailable()
  }, [appName, status, gameInfo])

  useEffect(() => {
    setIsLaunching(false)
    const updateGameInfo = async () => {
      const newInfo = await getGameInfo(appName, runner)
      if (newInfo) {
        setGameInfo(newInfo)
      }
    }
    updateGameInfo()
  }, [status])

  const grid = forceCard || layout === 'grid'
  const isInstalling = status === 'installing' || status === 'updating'
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = status === 'playing'
  const isQueued = status === 'queued'
  const isUninstalling = status === 'uninstalling'
  const notAvailable = !gameAvailable && isInstalled
  const notSupportedGame = thirdPartyManagedApp === 'Origin'
  const haveStatus =
    isMoving ||
    isReparing ||
    isInstalling ||
    isUpdating ||
    isQueued ||
    isUninstalling ||
    notAvailable ||
    notSupportedGame

  const { percent = '' } = progress
  const installingGrayscale = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  const storage: Storage = window.localStorage

  const imageSrc = getImageFormatting()

  async function handleUpdate() {
    return updateGame({ appName, runner, gameInfo })
  }

  function getImageFormatting() {
    const imageBase = cover
    if (imageBase === 'fallback') {
      return fallbackImage
    }
    if (runner === 'legendary') {
      return `${imageBase}?h=400&resize=1&w=300`
    } else {
      return imageBase
    }
  }

  function getStatus() {
    if (notSupportedGame) {
      return t('status.notSupportedGame', 'Not Supported')
    }
    if (isQueued) {
      return `${t('status.queued', 'Queued')}`
    }
    if (isUninstalling) {
      return t('status.uninstalling', 'Uninstalling')
    }
    if (isUpdating) {
      return t('status.updating') + ` ${percent}%`
    }
    if (isInstalling) {
      return t('status.installing') + ` ${percent || 0}%`
    }
    if (isMoving) {
      return t('gamecard.moving', 'Moving')
    }
    if (isReparing) {
      return t('gamecard.repairing', 'Repairing')
    }
    if (isInstalled && !gameAvailable) {
      return t('status.gameNotAvailable', 'Game not available')
    }
    if (isInstalled) {
      return `${t('status.installed')} ${runner === 'sideload' ? '' : size}`
    }

    return t('status.notinstalled')
  }

  const handleRemoveFromQueue = () => {
    window.api.removeFromDMQueue(appName)
  }

  const renderIcon = () => {
    if (notSupportedGame) {
      return (
        <FontAwesomeIcon
          title={t(
            'label.game.third-party-game',
            'Third-Party Game NOT Supported'
          )}
          className="downIcon"
          icon={faBan}
        />
      )
    }
    if (isUninstalling) {
      return (
        <button className="svg-button iconDisabled">
          <svg />
        </button>
      )
    }
    if (isQueued) {
      return (
        <SvgButton
          title={t('button.queue.remove', 'Remove from Queue')}
          className="queueIcon"
          onClick={() => handleRemoveFromQueue()}
        >
          <RemoveCircleIcon />
        </SvgButton>
      )
    }
    if (isPlaying) {
      return (
        <SvgButton
          className="cancelIcon"
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.stop')} (${title})`}
        >
          <StopIconAlt />
        </SvgButton>
      )
    }
    if (isInstalling || isQueued) {
      return (
        <SvgButton
          className="cancelIcon"
          onClick={async () => handlePlay(runner)}
          title={`${t('button.cancel')} (${title})`}
        >
          <StopIcon />
        </SvgButton>
      )
    }
    if (isInstalled) {
      return (
        <SvgButton
          className={gameAvailable ? 'playIcon' : 'cancelIcon'}
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.start')} (${title})`}
          disabled={isLaunching}
        >
          <PlayIcon />
        </SvgButton>
      )
    } else {
      return (
        <SvgButton
          className="downIcon"
          onClick={() => buttonClick()}
          title={`${t('button.install')} (${title})`}
        >
          <DownIcon />
        </SvgButton>
      )
    }
    return null
  }

  const isHiddenGame = useMemo(() => {
    return !!hiddenGames.list.find(
      (hiddenGame: HiddenGame) => hiddenGame.appName === appName
    )
  }, [hiddenGames, appName])

  const isFavouriteGame = useMemo(() => {
    return !!favouriteGames.list.find(
      (favouriteGame: FavouriteGame) => favouriteGame.appName === appName
    )
  }, [favouriteGames, appName])

  const isMac = ['osx', 'Mac']
  const isMacNative = isMac.includes(installedPlatform ?? '')
  const isLinuxNative = installedPlatform === 'linux'
  const pathname = `/settings/${runner}/${appName}/games_settings`

  const onUninstallClick = function () {
    setShowUninstallModal(true)
  }

  const items: Item[] = [
    {
      // remove from install queue
      label: t('button.queue.remove'),
      onclick: () => handleRemoveFromQueue(),
      show: isQueued && !isInstalling
    },
    {
      // stop if running
      label: t('label.playing.stop'),
      onclick: async () => handlePlay(runner),
      show: isPlaying
    },
    {
      // launch game
      label: t('label.playing.start'),
      onclick: async () => handlePlay(runner),
      show: isInstalled && !isPlaying && !isUpdating && !isQueued
    },
    {
      // update
      label: t('button.update', 'Update'),
      onclick: async () => handleUpdate(),
      show: hasUpdate && !isUpdating && !isQueued
    },
    {
      // install
      label: t('button.install'),
      onclick: () => buttonClick(),
      show: !isInstalled && (!isQueued || runner === 'sideload')
    },
    {
      // cancel installation/update
      label: t('button.cancel'),
      onclick: async () => handlePlay(runner),
      show: isInstalling || isUpdating
    },
    {
      // hide
      label: t('button.hide_game', 'Hide Game'),
      onclick: () => hiddenGames.add(appName, title),
      show: !isHiddenGame
    },
    {
      // unhide
      label: t('button.unhide_game', 'Unhide Game'),
      onclick: () => hiddenGames.remove(appName),
      show: isHiddenGame
    },
    {
      label: t('button.add_to_favourites', 'Add To Favourites'),
      onclick: () => favouriteGames.add(appName, title),
      show: !isFavouriteGame
    },
    {
      label: t('button.remove_from_favourites', 'Remove From Favourites'),
      onclick: () => favouriteGames.remove(appName),
      show: isFavouriteGame
    },
    {
      label: t('button.remove_from_recent', 'Remove From Recent'),
      onclick: async () => window.api.removeRecentGame(appName),
      show: isRecent
    },
    {
      // settings
      label: t('submenu.settings'),
      onclick: () =>
        navigate(pathname, {
          state: {
            fromGameCard: true,
            runner,
            hasCloudSave,
            isLinuxNative,
            isMacNative
          }
        }),
      show: isInstalled && !isUninstalling
    },
    {
      // uninstall
      label: t('button.uninstall'),
      onclick: onUninstallClick,
      show: isInstalled && !isUpdating
    }
  ]

  const instClass = isInstalled ? 'installed' : ''
  const hiddenClass = isHiddenGame ? 'hidden' : ''
  const notAvailableClass = !gameAvailable ? 'notAvailable' : ''
  const imgClasses = `gameImg ${isInstalled ? 'installed' : ''} ${
    allTilesInColor ? 'allTilesInColor' : ''
  }`
  const logoClasses = `gameLogo ${isInstalled ? 'installed' : ''} ${
    allTilesInColor && 'allTilesInColor'
  }`

  const wrapperClasses = `${
    grid ? 'gameCard' : 'gameListItem'
  }  ${instClass} ${hiddenClass} ${notAvailableClass}`

  const { activeController } = useContext(ContextProvider)

  const showUpdateButton =
    hasUpdate && !isUpdating && !isQueued && gameAvailable

  return (
    <div>
      {showUninstallModal && (
        <UninstallModal
          appName={appName}
          runner={runner}
          onClose={() => setShowUninstallModal(false)}
        />
      )}
      <ContextMenu items={items}>
        <div className={wrapperClasses}>
          {haveStatus && <span className="progress">{getStatus()}</span>}
          <Link
            to={`/gamepage/${runner}/${appName}`}
            state={{ gameInfo }}
            style={
              { '--installing-effect': installingGrayscale } as CSSProperties
            }
          >
            <StoreLogos runner={runner} />
            <CachedImage
              src={imageSrc ? imageSrc : fallbackImage}
              className={imgClasses}
              alt="cover"
            />
            {logo && (
              <CachedImage
                alt="logo"
                src={`${logo}?h=400&resize=1&w=300`}
                className={logoClasses}
              />
            )}
            <span
              className={classNames('gameListInfo', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              {getStatus()}
            </span>
            <span
              className={classNames('gameTitle', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              <span>{title}</span>
            </span>
            <span
              className={classNames('runner', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              {getStoreName(runner, t2('Other'))}
            </span>
          </Link>
          <>
            <span
              className={classNames('icons', {
                gamepad: activeController
              })}
            >
              {showUpdateButton && (
                <SvgButton
                  className="updateIcon"
                  title={`${t('button.update')} (${title})`}
                  onClick={async () => handleUpdate()}
                >
                  <FontAwesomeIcon size={'2x'} icon={faRepeat} />
                </SvgButton>
              )}
              {isInstalled && !isUninstalling && (
                <>
                  <SvgButton
                    title={`${t('submenu.settings')} (${title})`}
                    className="settingsIcon"
                    onClick={() =>
                      navigate(pathname, {
                        state: {
                          fromGameCard: true,
                          runner,
                          hasCloudSave,
                          isLinuxNative,
                          isMacNative,
                          gameInfo
                        }
                      })
                    }
                  >
                    <SettingsIcon />
                  </SvgButton>
                </>
              )}
              {renderIcon()}
            </span>
          </>
        </div>
      </ContextMenu>
    </div>
  )

  async function handlePlay(runner: Runner) {
    if (!isInstalled && !isQueued) {
      return install({
        gameInfo,
        installPath: folder || 'default',
        isInstalling,
        previousProgress,
        progress,
        t,
        showDialogModal
      })
    }

    if (isPlaying || isUpdating) {
      return sendKill(appName, runner)
    }

    if (isQueued) {
      storage.removeItem(appName)
      return window.api.removeFromDMQueue(appName)
    }

    if (isInstalled) {
      setIsLaunching(true)
      return launch({
        appName,
        t,
        runner,
        hasUpdate,
        syncCloud: autoSyncSaves,
        showDialogModal
      })
    }
    return
  }
}

export default GameCard
