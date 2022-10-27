import './index.css'

import React, { useContext, CSSProperties, useMemo, useState } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat } from '@fortawesome/free-solid-svg-icons'

import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'
import { FavouriteGame, HiddenGame, Runner } from 'common/types'
import { Link, useNavigate } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'frontend/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'frontend/assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'frontend/assets/stop-icon-alt.svg'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { getStoreName, install, launch, sendKill } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import { updateGame } from 'frontend/helpers/library'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import ContextMenu, { Item } from '../ContextMenu'

import classNames from 'classnames'
import LibraryContext from 'frontend/state/LibraryContext'
import StoreLogos from 'frontend/components/UI/StoreLogos'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import { hasProgress } from 'frontend/hooks/hasProgress'

interface Card {
  appName: string
  buttonClick: () => void
  cover: string
  coverList: string
  hasUpdate: boolean
  hasCloudSave: boolean
  isInstalled: boolean
  hasDownloads: boolean
  logo: string
  size: string
  title: string
  version: string
  runner: Runner
  installedPlatform: string | undefined
  forceCard?: boolean
}

const GameCard = ({
  cover,
  title,
  appName,
  isInstalled,
  logo,
  coverList,
  size = '',
  hasUpdate,
  hasCloudSave,
  buttonClick,
  forceCard,
  runner,
  installedPlatform
}: Card) => {
  const { hasGameStatus } = useContext(LibraryContext)
  const gameStatus = hasGameStatus(appName)
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const progress = hasProgress(appName, gameStatus)

  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const navigate = useNavigate()
  const {
    layout,
    platform,
    hiddenGames,
    favouriteGames,
    allTilesInColor,
    showDialogModal
  } = useContext(ContextProvider)

  const isWin = platform === 'win32'

  const grid = forceCard || layout === 'grid'

  const isInstalling =
    gameStatus.status === 'installing' || gameStatus.status === 'updating'
  const isUpdating = gameStatus.status === 'updating'
  const isReparing = gameStatus.status === 'repairing'
  const isMoving = gameStatus.status === 'moving'
  const isPlaying = gameStatus.status === 'playing'
  const isQueued = gameStatus.status === 'queued'
  const hasStatus =
    isMoving || isReparing || isInstalling || isUpdating || isQueued

  const installingGrayscale = isInstalling
    ? `${125 - (progress?.percent || 0)}%`
    : '100%'

  const imageSrc = getImageFormatting()

  async function handleUpdate() {
    await updateGame(appName, runner)
  }

  function getImageFormatting() {
    const imageBase = grid ? cover : coverList
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
    if (isUpdating) {
      return t('status.updating') + ` ${progress?.percent || 0}%`
    }
    if (isInstalling) {
      return t('status.installing') + ` ${progress?.percent || 0}%`
    }
    if (isMoving) {
      return t('gamecard.moving', 'Moving')
    }
    if (isReparing) {
      return t('gamecard.repairing', 'Repairing')
    }
    if (isInstalled) {
      return `${t('status.installed')} ${runner === 'sideload' ? '' : size}`
    }
    if (isQueued) {
      return `${t('status.queued', 'Queued')}`
    }

    return t('status.notinstalled')
  }

  const handleRemoveFromQueue = () => {
    window.api.removeFromDMQueue(appName)
  }

  const renderIcon = () => {
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
          className="playIcon"
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.start')} (${title})`}
        >
          <PlayIcon />
        </SvgButton>
      )
    }
    if (!isInstalled) {
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
  const isNative = isWin || isMacNative || isLinuxNative
  const pathname = isNative
    ? `/settings/${runner}/${appName}/other`
    : `/settings/${runner}/${appName}/wine`

  const onUninstallClick = function () {
    setShowUninstallModal(true)
  }

  const items: Item[] = [
    {
      label: t('button.update', 'Update'),
      onclick: async () => handleUpdate(),
      show: hasUpdate
    },
    {
      label: t('button.uninstall'),
      onclick: onUninstallClick,
      show: isInstalled
    },
    {
      label: t('button.install'),
      onclick: () => (!isInstalled ? buttonClick() : () => null),
      show: !isInstalled
    },
    {
      label: t('button.cancel'),
      onclick: async () => handlePlay(runner),
      show: isInstalling && isQueued
    },
    {
      label: t('button.hide_game', 'Hide Game'),
      onclick: () => hiddenGames.add(appName, title),
      show: !isHiddenGame
    },
    {
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
    }
  ]

  const instClass = isInstalled ? 'installed' : ''
  const hiddenClass = isHiddenGame ? 'hidden' : ''
  const imgClasses = `gameImg ${isInstalled ? 'installed' : ''} ${
    allTilesInColor && 'allTilesInColor'
  }`
  const logoClasses = `gameLogo ${isInstalled ? 'installed' : ''} ${
    allTilesInColor && 'allTilesInColor'
  }`

  const wrapperClasses = `${
    grid ? 'gameCard' : 'gameListItem'
  }  ${instClass} ${hiddenClass}`

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
          {hasStatus && <span className="progress">{getStatus()}</span>}
          <Link
            to={`gamepage/${runner}/${appName}`}
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
                active: hasStatus,
                installed: isInstalled
              })}
            >
              {getStatus()}
            </span>
            <span
              className={classNames('gameTitle', {
                active: hasStatus,
                installed: isInstalled
              })}
            >
              <span>{title}</span>
            </span>
            <span
              className={classNames('runner', {
                active: hasStatus,
                installed: isInstalled
              })}
            >
              {getStoreName(runner, t2('Other'))}
            </span>
          </Link>
          {
            <>
              <span className="icons">
                {hasUpdate && !isUpdating && (
                  <SvgButton
                    className="updateIcon"
                    title={`${t('button.update')} (${title})`}
                    onClick={async () => handleUpdate()}
                  >
                    <FontAwesomeIcon size={'2x'} icon={faRepeat} />
                  </SvgButton>
                )}
                {isInstalled && (
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
                            isMacNative
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
          }
        </div>
      </ContextMenu>
    </div>
  )

  async function handlePlay(runner: Runner) {
    if (!isInstalled && !isQueued) {
      return install({
        appName,
        installPath: gameStatus.folder || 'default',
        isInstalling,
        t,
        runner,
        showDialogModal
      })
    }

    if (isPlaying || isUpdating) {
      return sendKill(appName, runner)
    }

    if (isQueued) {
      return window.api.removeFromDMQueue(appName)
    }

    if (isInstalled) {
      return launch({ appName, t, runner, hasUpdate, showDialogModal })
    }
    return
  }
}

export default GameCard
