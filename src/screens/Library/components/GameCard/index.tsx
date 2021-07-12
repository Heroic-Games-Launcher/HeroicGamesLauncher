import './index.css'

import React, {
  useContext,
  useEffect,
  useState
} from 'react'

import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { GameStatus } from 'src/types'
import { Link, useHistory } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'src/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'src/assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'src/assets/stop-icon-alt.svg'
import {
  getProgress,
  install,
  launch,
  sendKill
} from 'src/helpers'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

import { NOT_SUPPORTED_GAMES } from 'src/constants'
import NewReleasesIcon from '@material-ui/icons/NewReleases'

const { ipcRenderer } = window.require('electron')
const storage: Storage = window.localStorage

interface Card {
  appName: string
  cover: string
  coverList: string
  hasUpdate: boolean
  isGame: boolean
  isInstalled: boolean
  logo: string
  size: string
  title: string
  version: string
}

interface InstallProgress {
  bytes: string
  eta: string
  percent: string
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
  hasUpdate
}: Card) => {
  const previousProgress = JSON.parse(storage.getItem(appName) || '{}') as InstallProgress
  const [progress, setProgress] = useState(previousProgress ?? {
    bytes: '0.00MiB',
    eta: '00:00:00',
    path: '',
    percent: '0.00%'
  } as InstallProgress)
  const { t } = useTranslation('gamepage')
  const notSupported = NOT_SUPPORTED_GAMES.includes(appName)

  const { libraryStatus, layout, handleGameStatus, platform } = useContext(
    ContextProvider
  )
  const history = useHistory()
  const isWin = platform === 'win32'

  const grid = layout === 'grid'

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const hasDownloads = Boolean(libraryStatus.filter(
    (game) => game.status === 'installing' || game.status === 'updating'
  ).length)
  const { status } = gameStatus || {}
  const isInstalling = status === 'installing' || status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = status === 'playing'
  const haveStatus = isMoving || isReparing || isInstalling || hasUpdate
  const path = isWin ? `/settings/${appName}/other` : `/settings/${appName}/wine`

  useEffect(() => {
    const progressInterval = setInterval(async () => {
      if (isInstalling) {
        const progress = await ipcRenderer.invoke(
          'requestGameProgress',
          appName
        )

        if (progress) {
          if (previousProgress){
            const legendaryPercent = getProgress(progress)
            const heroicPercent = getProgress(previousProgress)
            const newPercent: number = Math.round((legendaryPercent / 100) * (100 - heroicPercent) + heroicPercent)
            progress.percent = `${newPercent}%`
          }
          return setProgress(progress)
        }

        setProgress(progress)
      }
    }, 500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, appName])

  const { percent } = progress
  const effectPercent = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  function getStatus() {
    if (isInstalling) {
      return percent
    }
    if (isMoving) {
      return t('gamecard.moving', 'Moving')
    }
    if (isReparing) {
      return t('gamecard.repairing', 'Repairing')
    }
    if (hasUpdate) {
      return <NewReleasesIcon />
    }

    return ''
  }

  const renderIcon = () => {
    if (isPlaying) {
      return <StopIconAlt onClick={() => handlePlay()} />
    }
    if (isInstalling) {
      return <StopIcon onClick={() => handlePlay()} />
    }
    if (isInstalled && isGame) {
      return <PlayIcon onClick={() => handlePlay()} />
    }
    if (!isInstalled && !hasDownloads) {
      return <DownIcon onClick={() => handlePlay()} />
    }
    return null
  }
  return (
    <>
      <div className={grid ? 'gameCard' : 'gameListItem'}>
        {haveStatus && <span className="progress">{getStatus()}</span>}
        <Link
          to={{
            pathname: `/gameconfig/${appName}`
          }}
        >
          <span
            style={{
              backgroundImage: `url('${
                grid ? cover : coverList
              }?h=400&resize=1&w=300')`,
              backgroundSize: 'cover',
              filter: isInstalled ? 'none' : `grayscale(${effectPercent})`
            }}
            className={grid ? 'gameImg' : 'gameImgList'}
          >
            {logo && (
              <img
                alt="logo"
                src={`${logo}?h=400&resize=1&w=300`}
                style={{
                  filter: isInstalled ? 'none' : `grayscale(${effectPercent})`
                }}
                className="gameLogo"
              />
            )}
          </span>
        </Link>
        {grid ? (
          <>
            <div className="gameTitle">
              <span>{title}</span>
            </div>
            {
              <span
                className="icons"
                style={{
                  flexDirection: 'row',
                  width: isInstalled&&isGame ? '44%' : 'auto'
                }}
              >
                {renderIcon()}
                {isInstalled && isGame && <SettingsIcon fill={'var(--secondary)'} onClick={() => history.push(path, {fromGameCard: true})} />}
              </span>
            }
          </>
        ) : (
          <>
            {<div className="gameListInfo">{isInstalled ? size : '---'}</div>}
            <span className="gameTitleList">{title}</span>
            {
              <span className="icons">
                {renderIcon()}
                {isInstalled && isGame &&  <SettingsIcon fill={'var(--secondary)'} onClick={() => history.push(path, {fromGameCard: true})} />}
              </span>
            }
          </>
        )}
      </div>
      {!grid ? <hr style={{ opacity: 0.1, width: '90%' }} /> : ''}
    </>
  )

  async function handlePlay() {
    if (!isInstalled) {
      return await install({
        appName,
        handleGameStatus,
        installPath: notSupported ? 'import' : 'default',
        isInstalling,
        previousProgress,
        progress,
        t
      })
    }
    if (status === 'playing' || status === 'updating') {
      await handleGameStatus({ appName, status: 'done' })
      return sendKill(appName)
    }
    if (isInstalled) {
      await handleGameStatus({ appName, status: 'playing' })
      return await launch(appName, t, handleGameStatus)
    }
    return
  }
}

export default GameCard
