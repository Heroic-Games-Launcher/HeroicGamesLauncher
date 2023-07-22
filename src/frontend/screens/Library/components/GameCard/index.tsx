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
import { FavouriteGame, GameInfo, HiddenGame, Runner } from 'common/types'
import { Link, useNavigate } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'frontend/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'frontend/assets/settings_icon_alt.svg'
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
import { updateGame } from 'frontend/helpers/library'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import ContextMenu, { Item } from '../ContextMenu'
import { hasProgress } from 'frontend/hooks/hasProgress'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'

import classNames from 'classnames'
import StoreLogos from 'frontend/components/UI/StoreLogos'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import { getCardStatus, getImageFormatting } from './constants'
import { hasStatus } from 'frontend/hooks/hasStatus'

interface Card {
  buttonClick: () => void
  hasUpdate: boolean
  isRecent: boolean
  justPlayed: boolean
  gameInfo: GameInfo
  forceCard?: boolean
}

const storage: Storage = window.localStorage

const GameCard = ({
  hasUpdate,
  buttonClick,
  forceCard,
  isRecent = false,
  justPlayed = false,
  gameInfo: gameInfoFromProps
}: Card) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // render an empty div until the card enters the viewport
    // check GameList for the other side of this detection
    const callback = (e: CustomEvent<{ appNames: string[] }>) => {
      if (e.detail.appNames.includes(gameInfoFromProps.app_name)) {
        setVisible(true)
      }
    }

    window.addEventListener('visible-cards', callback)

    return () => {
      window.removeEventListener('visible-cards', callback)
    }
  }, [])

  const [gameInfo, setGameInfo] = useState<GameInfo>(gameInfoFromProps)
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)

  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const navigate = useNavigate()

  const {
    layout,
    hiddenGames,
    favouriteGames,
    allTilesInColor,
    showDialogModal,
    setIsSettingsModalOpen,
    activeController
  } = useContext(ContextProvider)

  const {
    title,
    art_cover,
    art_square: cover,
    art_logo: logo = undefined,
    app_name: appName,
    runner,
    is_installed: isInstalled,
    install: gameInstallInfo
  } = { ...gameInfoFromProps }

  const isInstallable =
    gameInfo.installable === undefined || gameInfo.installable // If it's undefined we assume it's installable

  const [progress, previousProgress] = hasProgress(appName)
  const { install_size: size = '0' } = {
    ...gameInstallInfo
  }

  const { status, folder, label } = hasStatus(appName, gameInfo, size)

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

  async function handleUpdate() {
    if (gameInfo.runner !== 'sideload')
      updateGame({ appName, runner, gameInfo })
  }

  const grid = forceCard || layout === 'grid'

  const {
    isInstalling,
    notSupportedGame,
    isUninstalling,
    isQueued,
    isPlaying,
    notAvailable,
    isUpdating,
    haveStatus
  } = getCardStatus(status, isInstalled, layout)

  const installingGrayscale = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  const handleRemoveFromQueue = () => {
    window.api.removeFromDMQueue(appName)
  }

  const renderIcon = () => {
    if (!isInstallable) {
      return (
        <FontAwesomeIcon
          title={t(
            'label.game.not-installable-game',
            'Game is NOT Installable'
          )}
          className="downIcon"
          icon={faBan}
        />
      )
    }

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
      const disabled =
        isLaunching ||
        ['syncing-saves', 'launching', 'ubisoft'].includes(status!)
      return (
        <SvgButton
          className={!notAvailable ? 'playIcon' : 'notAvailableIcon'}
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.start')} (${title})`}
          disabled={disabled}
        >
          {justPlayed ? <span>PLAY</span> : <PlayIcon />}
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
      show: !isInstalled && !isQueued && isInstallable
    },
    {
      // cancel installation/update
      label: t('button.cancel'),
      onclick: async () => handlePlay(runner),
      show: isInstalling || isUpdating
    },
    {
      // open the game page
      label: t('button.details', 'Details'),
      onclick: () =>
        navigate(`/gamepage/${runner}/${appName}`, { state: { gameInfo } }),
      show: true
    },
    {
      // settings
      label: t('submenu.settings', 'Settings'),
      onclick: () => setIsSettingsModalOpen(true, 'settings', gameInfo),
      show: isInstalled && !isUninstalling
    },
    {
      label: t('submenu.logs', 'Logs'),
      onclick: () => setIsSettingsModalOpen(true, 'log', gameInfo),
      show:
        isInstalled &&
        !isUninstalling &&
        gameInfo.install.platform !== 'Browser'
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
      // uninstall
      label: t('button.uninstall'),
      onclick: onUninstallClick,
      show: isInstalled && !isUpdating
    }
  ]

  const instClass = isInstalled ? 'installed' : ''
  const hiddenClass = isHiddenGame ? 'hidden' : ''
  const notAvailableClass = notAvailable ? 'notAvailable' : ''
  const gamepadClass = activeController ? 'gamepad' : ''
  const justPlayedClass = justPlayed ? 'justPlayed' : ''
  const imgClasses = `gameImg ${isInstalled ? 'installed' : ''} ${
    allTilesInColor ? 'allTilesInColor' : ''
  }`
  const logoClasses = `gameLogo ${isInstalled ? 'installed' : ''} ${
    allTilesInColor && 'allTilesInColor'
  }`

  const wrapperClasses = `${
    grid ? 'gameCard' : 'gameListItem'
  }  ${instClass} ${hiddenClass} ${notAvailableClass} ${gamepadClass} ${justPlayedClass}`

  const showUpdateButton =
    hasUpdate && !isUpdating && !isQueued && !notAvailable

  if (!visible) {
    return (
      <div
        className={wrapperClasses}
        data-app-name={appName}
        data-invisible={true}
      ></div>
    )
  }

  return (
    <div>
      {showUninstallModal && (
        <UninstallModal
          appName={appName}
          runner={runner}
          isDlc={Boolean(gameInfo.install.is_dlc)}
          onClose={() => setShowUninstallModal(false)}
        />
      )}
      <ContextMenu items={items}>
        <div className={wrapperClasses} data-app-name={appName}>
          {haveStatus && <span className="gameCardStatus">{label}</span>}
          <Link
            to={`/gamepage/${runner}/${appName}`}
            state={{ gameInfo }}
            style={
              { '--installing-effect': installingGrayscale } as CSSProperties
            }
          >
            <StoreLogos runner={runner} />
            {justPlayed ? (
              <CachedImage
                src={art_cover}
                className="justPlayedImg"
                alt={title}
              />
            ) : (
              <CachedImage
                src={getImageFormatting(cover, runner)}
                className={imgClasses}
                alt="cover"
              />
            )}
            {logo && (
              <CachedImage
                alt="logo"
                src={`${logo}?h=400&resize=1&w=300`}
                className={logoClasses}
              />
            )}
            {haveStatus && (
              <span
                className={classNames('gameListInfo', {
                  active: haveStatus,
                  installed: isInstalled
                })}
              >
                {label}
              </span>
            )}
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
            <span className="icons">
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
                      setIsSettingsModalOpen(true, 'settings', gameInfo)
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
    if (!isInstalled && !isQueued && gameInfo.runner !== 'sideload') {
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
        showDialogModal
      })
    }
    return
  }
}

export default GameCard
