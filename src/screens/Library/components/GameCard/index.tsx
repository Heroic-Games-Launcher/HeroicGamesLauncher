import './index.css'

import React, { useContext, useEffect, useState, CSSProperties } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat } from '@fortawesome/free-solid-svg-icons'

import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { GameStatus, InstallProgress, Runner } from 'src/types'
import { Link, useHistory } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'src/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'src/assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'src/assets/stop-icon-alt.svg'
import { getProgress, install, launch, sendKill } from 'src/helpers'
import { ContextMenu, MenuItem, ContextMenuTrigger } from 'react-contextmenu'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

import { uninstall, updateGame } from 'src/helpers/library'
import { SvgButton } from 'src/components/UI'

const { ipcRenderer } = window.require('electron')
const storage: Storage = window.localStorage

interface Card {
  appName: string
  buttonClick: () => void
  cover: string
  coverList: string
  hasUpdate: boolean
  isGame: boolean
  isInstalled: boolean
  logo: string
  size: string
  title: string
  version: string
  isMacNative: boolean
  isLinuxNative: boolean
  runner: Runner
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
  buttonClick,
  forceCard,
  isMacNative,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isLinuxNative,
  runner
}: Card) => {
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress
  const [progress, setProgress] = useState(
    previousProgress ??
      ({
        bytes: '0.00MiB',
        eta: '00:00:00',
        path: '',
        percent: '0.00%',
        folder: ''
      } as InstallProgress)
  )
  const { t } = useTranslation('gamepage')

  const { libraryStatus, layout, handleGameStatus, platform } =
    useContext(ContextProvider)
  const history = useHistory()
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
  const path =
    isWin || isMacNative
      ? `/settings/${appName}/other`
      : `/settings/${appName}/wine`

  useEffect(() => {
    const progressInterval = setInterval(async () => {
      if (isInstalling) {
        const progress = await ipcRenderer.invoke(
          'requestGameProgress',
          appName,
          runner
        )

        if (progress) {
          if (previousProgress) {
            const legendaryPercent = getProgress(progress)
            const heroicPercent = getProgress(previousProgress)
            const newPercent: number = Math.round(
              (legendaryPercent / 100) * (100 - heroicPercent) + heroicPercent
            )
            progress.percent = `${newPercent}%`
          }
          return setProgress(progress)
        }

        setProgress(progress)
      }
    }, 1500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, appName])

  const { percent = '' } = progress
  const installingGrayscale = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  const instClass = isInstalled ? 'installed' : ''
  const imgClasses = `gameImg ${isInstalled ? 'installed' : ''}`
  const logoClasses = `gameLogo ${isInstalled ? 'installed' : ''}`
  const imageSrc =
    runner == 'legendary'
      ? `${grid ? cover : coverList}?h=400&resize=1&w=300`
      : grid
      ? cover
      : coverList
  const wrapperClasses = `${grid ? 'gameCard' : 'gameListItem'}  ${instClass}`

  async function handleUpdate() {
    await handleGameStatus({ appName, runner, status: 'updating' })
    await updateGame(appName, runner)
    return handleGameStatus({ appName, runner, status: 'done' })
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
        <SvgButton onClick={() => handleUpdate()}>
          <FontAwesomeIcon size={'2x'} icon={faRepeat} />
        </SvgButton>
      )
    }

    return null
  }

  const renderIcon = () => {
    if (isPlaying) {
      return (
        <SvgButton onClick={() => handlePlay(runner)}>
          <StopIconAlt className="cancelIcon" />
        </SvgButton>
      )
    }
    if (isInstalling) {
      return (
        <SvgButton onClick={() => handlePlay(runner)}>
          <StopIcon />
        </SvgButton>
      )
    }
    if (isInstalled && isGame) {
      return (
        <SvgButton className="playButton" onClick={() => handlePlay(runner)}>
          <PlayIcon className="playIcon" />
        </SvgButton>
      )
    }
    if (!isInstalled) {
      if (hasDownloads) {
        return (
          <SvgButton onClick={(e) => e.preventDefault()}>
            <DownIcon className="iconDisabled" />
          </SvgButton>
        )
      }
      return (
        <SvgButton onClick={() => buttonClick()}>
          <DownIcon className="downIcon" />
        </SvgButton>
      )
    }
    return null
  }

  return (
    <>
      <ContextMenuTrigger id={appName}>
        <div className={wrapperClasses}>
          {haveStatus && <span className="progress">{getStatus()}</span>}
          <Link
            to={{
              pathname: `/gameconfig/${appName}`
            }}
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
            <span className="icons">
              {renderIcon()}
              {isInstalled && isGame && (
                <SvgButton
                  onClick={() =>
                    history.push({
                      pathname: path,
                      state: { fromGameCard: true }
                    })
                  }
                >
                  <SettingsIcon fill={'var(--text-default)'} />
                </SvgButton>
              )}
            </span>
          }
        </div>
        <ContextMenu id={appName} className="contextMenu">
          {isInstalled && (
            <>
              <MenuItem onClick={() => handlePlay(runner)}>
                {t('label.playing.start')}
              </MenuItem>
              <MenuItem
                onClick={() =>
                  history.push({
                    pathname: path,
                    state: { fromGameCard: true }
                  })
                }
              >
                {t('submenu.settings')}
              </MenuItem>
              {hasUpdate && (
                <MenuItem onClick={() => handleUpdate()}>
                  {t('button.update', 'Update')}
                </MenuItem>
              )}
              <MenuItem
                onClick={() =>
                  uninstall({ appName, handleGameStatus, t, runner })
                }
              >
                {t('button.uninstall')}
              </MenuItem>
            </>
          )}
          {!isInstalled && (
            <MenuItem
              className={hasDownloads ? 'menuItem disabled' : 'menuItem'}
              onClick={() => (!hasDownloads ? buttonClick() : () => null)}
            >
              {t('button.install')}
            </MenuItem>
          )}
          {isInstalling && (
            <MenuItem onClick={() => handlePlay(runner)}>
              {t('button.cancel')}
            </MenuItem>
          )}
        </ContextMenu>
      </ContextMenuTrigger>
    </>
  )

  async function handlePlay(runner: Runner) {
    if (!isInstalled) {
      return await install({
        appName,
        handleGameStatus,
        installPath: folder || 'default',
        isInstalling,
        previousProgress,
        progress,
        t,
        runner
      })
    }
    if (status === 'playing' || status === 'updating') {
      await handleGameStatus({ appName, runner, status: 'done' })
      return sendKill(appName, runner)
    }
    if (isInstalled) {
      return await launch({ appName, t, runner })
    }
    return
  }
}

export default GameCard
