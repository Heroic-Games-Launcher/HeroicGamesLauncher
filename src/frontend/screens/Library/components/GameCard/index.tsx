import './index.css'

import React, { useContext, CSSProperties, useMemo, useState } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat } from '@fortawesome/free-solid-svg-icons'

import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'
import { FavouriteGame, GameStatus, HiddenGame, Runner } from 'common/types'
import { Link, useNavigate } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'frontend/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'frontend/assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'frontend/assets/stop-icon-alt.svg'
import { getProgress, install, launch, sendKill } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import fallbackImage from 'frontend/assets/fallback-image.jpg'
import { updateGame } from 'frontend/helpers/library'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import ContextMenu, { Item } from '../ContextMenu'
import { hasProgress } from 'frontend/hooks/hasProgress'

import { ReactComponent as EpicLogo } from 'frontend/assets/epic-logo.svg'
import { ReactComponent as GOGLogo } from 'frontend/assets/gog-logo.svg'
import classNames from 'classnames'
import UninstallModal from 'frontend/components/UI/UninstallModal'

interface Card {
  appName: string
  buttonClick: () => void
  cover: string
  coverList: string
  hasUpdate: boolean
  hasCloudSave: boolean
  isInstalled: boolean
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
  const [progress, previousProgress] = hasProgress(appName)
  const [showUninstallModal, setShowUninstallModal] = useState(false)

  const { t } = useTranslation('gamepage')

  const navigate = useNavigate()
  const {
    libraryStatus,
    layout,
    handleGameStatus,
    platform,
    hiddenGames,
    favouriteGames,
    allTilesInColor,
    epic,
    gog,
    showDialogModal
  } = useContext(ContextProvider)

  const isWin = platform === 'win32'

  const grid = forceCard || layout === 'grid'

  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const hasDownloads = Boolean(
    libraryStatus.filter(
      (game: GameStatus) =>
        game.status === 'installing' || game.status === 'updating'
    ).length
  )

  const { status, folder } = gameStatus || {}
  const isInstalling = status === 'installing' || status === 'updating'
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = status === 'playing'
  const haveStatus = isMoving || isReparing || isInstalling || isUpdating

  const { percent = '' } = progress
  const installingGrayscale = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  const imageSrc = getImageFormatting()

  async function handleUpdate() {
    await handleGameStatus({ appName, runner, status: 'updating' })
    await updateGame(appName, runner)
    return handleGameStatus({ appName, runner, status: 'done' })
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
    if (isInstalled) {
      return `${t('status.installed')} (${size})`
    }

    return t('status.notinstalled')
  }

  const renderIcon = () => {
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
    if (isInstalling) {
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
      if (hasDownloads) {
        return (
          <SvgButton
            className="iconDisabled"
            onClick={(e) => e.preventDefault()}
            title={`${t('button.cancel')} (${title})`}
          >
            <DownIcon />
          </SvgButton>
        )
      }
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
      label: t('label.playing.start'),
      onclick: async () => handlePlay(runner),
      show: isInstalled
    },
    {
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
      show: isInstalled
    },
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
      onclick: () => (!hasDownloads ? buttonClick() : () => null),
      show: !isInstalled && !isInstalling && !hasDownloads
    },
    {
      label: t('button.cancel'),
      onclick: async () => handlePlay(runner),
      show: isInstalling
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

  const getRunner = () => {
    switch (runner) {
      case 'legendary':
        return 'Epic Games'
      case 'gog':
        return 'GOG'
      default:
        return 'Heroic'
    }
  }

  const showStoreLogos = () => {
    if (epic.username && gog.username) {
      return runner === 'legendary' ? (
        <EpicLogo className="store-icon" />
      ) : (
        <GOGLogo className="store-icon" />
      )
    }
    return null
  }

  return (
    <>
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
            to={`gamepage/${runner}/${appName}`}
            style={
              { '--installing-effect': installingGrayscale } as CSSProperties
            }
          >
            {showStoreLogos()}
            <CachedImage src={imageSrc} className={imgClasses} alt="cover" />
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
              {getRunner()}
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
    </>
  )

  async function handlePlay(runner: Runner) {
    if (!isInstalled) {
      return install({
        appName,
        handleGameStatus,
        installPath: folder || 'default',
        isInstalling,
        previousProgress,
        progress,
        t,
        runner,
        showDialogModal
      })
    }
    if (status === 'playing' || status === 'updating') {
      return sendKill(appName, runner)
    }
    if (isInstalled) {
      return launch({ appName, t, runner, hasUpdate, showDialogModal })
    }
    return
  }
}

export default GameCard
