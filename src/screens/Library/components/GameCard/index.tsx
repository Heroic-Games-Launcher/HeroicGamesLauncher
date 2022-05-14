import './index.css'

import React, { useContext, useEffect, useState, CSSProperties } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat } from '@fortawesome/free-solid-svg-icons'

import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { GameStatus, Runner } from 'src/types'
import { Link, useNavigate } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'src/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'src/assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'src/assets/stop-icon-alt.svg'
import { getProgress, install, launch, sendKill } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import fallbackImage from 'src/assets/fallback-image.jpg'
import { uninstall, updateGame } from 'src/helpers/library'
import { SvgButton } from 'src/components/UI'
import ContextMenu, { Item } from '../ContextMenu'
import { hasProgress } from 'src/hooks/hasProgress'

interface Card {
  appName: string
  buttonClick: () => void
  cover: string
  coverList: string
  hasUpdate: boolean
  hasCloudSave: boolean
  isGame: boolean
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
  isGame,
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

  const { t } = useTranslation('gamepage')

  const navigate = useNavigate()
  const {
    libraryStatus,
    layout,
    handleGameStatus,
    platform,
    hiddenGames,
    favouriteGames
  } = useContext(ContextProvider)

  const isWin = platform === 'win32'

  const grid = forceCard || layout === 'grid'

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const hasDownloads = Boolean(
    libraryStatus.filter(
      (game) => game.status === 'installing' || game.status === 'updating'
    ).length
  )

  const { status, folder } = gameStatus || {}
  const isInstalling = status === 'installing' || status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = status === 'playing'
  const haveStatus = isMoving || isReparing || isInstalling || hasUpdate

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
    if (isInstalling) {
      return t('status.installing') + ` ${percent}`
    }
    if (isMoving) {
      return t('gamecard.moving', 'Moving')
    }
    if (isReparing) {
      return t('gamecard.repairing', 'Repairing')
    }
    if (hasUpdate) {
      return (
        <SvgButton onClick={async () => handleUpdate()}>
          <FontAwesomeIcon size={'2x'} icon={faRepeat} />
        </SvgButton>
      )
    }

    return null
  }

  const renderIcon = () => {
    if (isPlaying) {
      return (
        <SvgButton
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.stop')} (${title})`}
        >
          <StopIconAlt className="cancelIcon" />
        </SvgButton>
      )
    }
    if (isInstalling) {
      return (
        <SvgButton
          onClick={async () => handlePlay(runner)}
          title={`${t('button.cancel')} (${title})`}
        >
          <StopIcon />
        </SvgButton>
      )
    }
    if (isInstalled && isGame) {
      return (
        <SvgButton
          className="playButton"
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.start')} (${title})`}
        >
          <PlayIcon className="playIcon" />
        </SvgButton>
      )
    }
    if (!isInstalled) {
      if (hasDownloads) {
        return (
          <SvgButton
            onClick={(e) => e.preventDefault()}
            title={`${t('button.cancel')} (${title})`}
          >
            <DownIcon className="iconDisabled" />
          </SvgButton>
        )
      }
      return (
        <SvgButton
          onClick={() => buttonClick()}
          title={`${t('button.install')} (${title})`}
        >
          <DownIcon className="downIcon" />
        </SvgButton>
      )
    }
    return null
  }

  const [isHiddenGame, setIsHiddenGame] = useState(false)
  const [isFavouriteGame, setIsFavouriteGame] = useState(false)

  useEffect(() => {
    const found = !!hiddenGames.list.find(
      (hiddenGame) => hiddenGame.appName === appName
    )

    setIsHiddenGame(found)
  }, [hiddenGames, appName])

  useEffect(() => {
    const found = !!favouriteGames.list.find(
      (favouriteGame) => favouriteGame.appName === appName
    )

    setIsFavouriteGame(found)
  }, [favouriteGames, appName])

  const isMac = ['osx', 'Mac']
  const isMacNative = isMac.includes(installedPlatform ?? '')
  const isLinuxNative = installedPlatform === 'linux'
  const isNative = isWin || isMacNative || isLinuxNative
  const pathname = isNative
    ? `/settings/${appName}/other`
    : `/settings/${appName}/wine`

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
      onclick: async () =>
        uninstall({
          appName,
          handleGameStatus,
          t,
          runner
        }),
      show: isInstalled
    },
    {
      label: t('button.install'),
      onclick: () => (!hasDownloads ? buttonClick() : () => null),
      show: !isInstalled && !isInstalling
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
  const imgClasses = `gameImg ${isInstalled ? 'installed' : ''}`
  const logoClasses = `gameLogo ${isInstalled ? 'installed' : ''}`

  const wrapperClasses = `${
    grid ? 'gameCard' : 'gameListItem'
  }  ${instClass} ${hiddenClass}`

  return (
    <>
      <ContextMenu items={items}>
        <div className={wrapperClasses}>
          {haveStatus && <span className="progress">{getStatus()}</span>}
          <Link
            to={`gamepage/${appName}`}
            style={
              { '--installing-effect': installingGrayscale } as CSSProperties
            }
          >
            <img src={imageSrc} className={imgClasses} alt="cover" />
            {logo && (
              <img
                alt="logo"
                src={`${logo}?h=400&resize=1&w=300`}
                className={logoClasses}
              />
            )}
          </Link>
          <span className="gameListInfo">{isInstalled ? size : '---'}</span>
          <span className="gameTitle">{title}</span>
          {
            <>
              <span className="icons">
                {renderIcon()}
                {isInstalled && isGame && (
                  <>
                    <SvgButton
                      title={`${t('submenu.settings')} (${title})`}
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
                      <SettingsIcon fill={'var(--text-default)'} />
                    </SvgButton>
                  </>
                )}
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
        platformToInstall: ''
      })
    }
    if (status === 'playing' || status === 'updating') {
      await handleGameStatus({ appName, runner, status: 'done' })
      return sendKill(appName, runner)
    }
    if (isInstalled) {
      return launch({ appName, t, runner })
    }
    return
  }
}

export default GameCard
