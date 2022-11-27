import './index.css'

import { observer } from 'mobx-react'
import React, { CSSProperties, useContext, useEffect, useState } from 'react'

import { faRepeat } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { GameStatus } from 'common/types'
import { ReactComponent as DownIcon } from 'frontend/assets/down-icon.svg'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import { ReactComponent as PlayIcon } from 'frontend/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'frontend/assets/settings-sharp.svg'
import { ReactComponent as StopIconAlt } from 'frontend/assets/stop-icon-alt.svg'
import { ReactComponent as StopIcon } from 'frontend/assets/stop-icon.svg'
import { CachedImage, SvgButton } from 'frontend/components/UI'
import { getProgress, getStoreName } from 'frontend/helpers'
import { updateGame } from 'frontend/helpers/library'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import ContextMenu, { Item } from '../ContextMenu'

import classNames from 'classnames'
import StoreLogos from 'frontend/components/UI/StoreLogos'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import { globalStore } from 'frontend/state/GlobalState'
import { useMenuContext } from './hooks/useMenuContext'
import { Game } from '../../../../state/new/Game'

const downloadQueue = globalStore.gameDownloadQueue

interface Card {
  buttonClick: () => void
  hasUpdate: boolean
  forceCard?: boolean
  isRecent: boolean
  game: Game
}

const GameCard = ({ hasUpdate, forceCard, game }: Card) => {
  const {
    title,
    art_square: cover,
    art_logo: logo,
    app_name: appName,
    runner,
    is_installed,
    cloud_save_enabled: hasCloudSave,
    install: { platform: installedPlatform }
  } = game.data

  const progress = game.downloadProgress
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [gameAvailable, setGameAvailable] = useState(false)

  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const isInstalled = is_installed && gameAvailable

  const navigate = useNavigate()

  const { libraryStatus, layout, handleGameStatus, allTilesInColor } =
    useContext(ContextProvider)

  useEffect(() => {
    const checkGameAvailable = async () => {
      const gameAvailable = await window.api.isGameAvailable({
        appName,
        runner
      })
      setGameAvailable(gameAvailable)
    }
    checkGameAvailable()
  }, [appName])

  const grid = forceCard || layout === 'grid'

  const { status } =
    libraryStatus.find((game: GameStatus) => game.appName === appName) || {}

  const isInstalling = game.isInstalling || game.isUpdating
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = game.isPlaying
  const isQueued = game.isQueued
  const isUninstalling = status === 'uninstalling'
  const haveStatus =
    isMoving ||
    isReparing ||
    isInstalling ||
    isUpdating ||
    isQueued ||
    isUninstalling

  const installingGrayscale = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  const imageSrc = getImageFormatting()

  async function handleUpdate() {
    return updateGame({ appName, runner, gameInfo: game.data })
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
    return `${t(`status.${status || 'notinstalled'}`)}`
  }

  const handleRemoveFromQueue = () => {
    window.api.removeFromDMQueue(appName)
    handleGameStatus({ appName, status: 'done' })
  }

  const renderIcon = () => {
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
          onClick={() => game.stop()}
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
          onClick={async () => downloadQueue.removeGame(game)}
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
          onClick={async () => game.play()}
          title={`${t('label.playing.start')} (${title})`}
        >
          <PlayIcon />
        </SvgButton>
      )
    } else {
      return (
        <SvgButton
          className="downIcon"
          onClick={async () => downloadQueue.addGame(game)}
          title={`${t('button.install')} (${title})`}
        >
          <DownIcon />
        </SvgButton>
      )
    }
    return null
  }

  const isHiddenGame = game.isHidden

  const isMac = ['osx', 'Mac']
  const isMacNative = isMac.includes(installedPlatform ?? '')
  const isLinuxNative = installedPlatform === 'linux'
  const pathname = `/settings/${runner}/${appName}/games_settings`

  const items: Item[] = useMenuContext(game, downloadQueue)

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

  const { activeController } = useContext(ContextProvider)

  const showUpdateButton = hasUpdate && !isUpdating && !isQueued

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
            state={{ gameInfo: game.data }}
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
                          gameInfo: game.data
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
}

export default observer(GameCard)
