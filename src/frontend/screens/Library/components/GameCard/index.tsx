import './index.css'

import { observer } from 'mobx-react'
import React, { CSSProperties, useContext } from 'react'

import { faRepeat } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import { ReactComponent as SettingsIcon } from 'frontend/assets/settings-sharp.svg'
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
import { Game } from '../../../../state/new/model/Game'
import useDisclosure from '../../../../hooks/useDisclosure'
import ActionButton from './ActionButton'

const downloadQueue = globalStore.gameDownloadQueue

interface Card {
  buttonClick: () => void
  hasUpdate: boolean
  forceCard?: boolean
  isRecent: boolean
  game: Game
  layout: string
}

const GameCard = ({ hasUpdate, forceCard, game, layout }: Card) => {
  const {
    title,
    art_square: cover,
    art_logo: logo,
    app_name: appName,
    runner,
    cloud_save_enabled: hasCloudSave,
    install: { platform: installedPlatform }
  } = game.data

  const progress = game.gameStatus?.progress
  const uninstallModal = useDisclosure()

  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()

  const isInstalled = game.isInstalled && game.isAvailable

  const navigate = useNavigate()

  const { allTilesInColor } = useContext(ContextProvider)

  const grid = forceCard || layout === 'grid'

  const { isUninstalling, isQueued, isUpdating } = game

  const isInstalling = game.isInstalling || game.isUpdating
  const isReparing = game.status === 'repairing'
  const isMoving = game.status === 'moving'

  const haveStatus =
    isMoving ||
    isReparing ||
    isInstalling ||
    isUpdating ||
    isQueued ||
    isUninstalling

  const installingGrayscale = isInstalling
    ? progress
      ? `${125 - getProgress(progress)}%`
      : '0%'
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
    return `${t(`status.${game.status || 'notinstalled'}`)}`
  }

  const isHiddenGame = game.isHidden

  const isMac = ['osx', 'Mac']
  const isMacNative = isMac.includes(installedPlatform ?? '')
  const isLinuxNative = installedPlatform === 'linux'
  const pathname = `/settings/${runner}/${appName}/games_settings`

  const items: Item[] = useMenuContext({
    game,
    downloadQueue,
    handleUninstall: uninstallModal.open
  })

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
      {uninstallModal.opened && (
        <UninstallModal
          appName={appName}
          runner={runner}
          onClose={() => uninstallModal.close()}
        />
      )}
      <ContextMenu items={items}>
        <div className={wrapperClasses}>
          {haveStatus && <span className="progress">{getStatus()}</span>}
          <Link
            to={`/gamepage/${runner}/${appName}`}
            style={
              {
                '--installing-effect': installingGrayscale
              } as CSSProperties
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
              )}
              <ActionButton game={game} title={title} />
            </span>
          </>
        </div>
      </ContextMenu>
    </div>
  )
}

export default observer(GameCard)
