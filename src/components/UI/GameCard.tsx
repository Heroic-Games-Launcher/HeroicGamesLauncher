/* eslint-disable complexity */
import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../../state/ContextProvider'
import { GameStatus } from '../../types'
import { getProgress, sendKill, launch, updateGame } from '../../helper'
import { handleInstall } from '../utls'
const { ipcRenderer, remote } = window.require('electron')
const {
  dialog: { showMessageBox },
} = remote
interface Card {
  cover: string
  coverList: string
  logo: string
  title: string
  appName: string
  isInstalled: boolean
  version: string
  size: string
  dlcs: string[]
}

interface InstallProgress {
  percent: string
  bytes: string
  eta: string
}

const GameCard = ({
  cover,
  title,
  appName,
  isInstalled,
  logo,
  coverList,
  size,
  dlcs,
}: Card) => {
  const [progress, setProgress] = useState({
    percent: '0.00%',
    bytes: '0/0MB',
    eta: '',
  } as InstallProgress)
  const { t } = useTranslation('gamepage')

  const { libraryStatus, layout, handleGameStatus } = useContext(
    ContextProvider
  )

  const grid = layout === 'grid'

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}
  const isInstalling = status === 'installing' || status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const haveStatus = isMoving || isReparing || isInstalling

  useEffect(() => {
    const progressInterval = setInterval(async () => {
      if (isInstalling) {
        const progress = await ipcRenderer.invoke(
          'requestGameProgress',
          appName
        )
        setProgress(progress)
      }
    }, 1500)
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
    return ''
  }

  return (
    <>
      <div className={grid ? 'gameCard' : 'gameListItem'}>
        {haveStatus && <span className="progress">{getStatus()}</span>}
        {logo && (
          <img
            alt="logo"
            src={logo}
            style={{
              filter: isInstalled ? 'none' : `grayscale(${effectPercent})`,
            }}
            className="gameLogo"
          />
        )}
        <Link
          to={{
            pathname: `/gameconfig/${appName}`,
          }}
        >
          <img
            alt="cover-art"
            src={grid ? cover : coverList}
            style={{
              filter: isInstalled ? 'none' : `grayscale(${effectPercent})`,
            }}
            className={grid ? 'gameImg' : 'gameImgList'}
          />
        </Link>
        {grid ? (
          <div className="gameTitle">
            <span>{title}</span>
          </div>
        ) : (
          <>
            {
              <div className="gameListInfo">
                {size}
                <br />
                {dlcs.length > 0 ? `Dlcs : ${dlcs.length}` : 'Dlcs : 0'}
              </div>
            }
            <span className="gameTitleList">{title}</span>
            {
              <i
                className={`material-icons ${
                  isInstalling
                    ? 'is-danger'
                    : isInstalled
                    ? 'is-success'
                    : 'is-primary'
                } gameActionList`}
                onClick={() => handlePlay()}
              >
                {isInstalling
                  ? 'cancel'
                  : isInstalled
                  ? 'play_circle'
                  : 'get_app'}
              </i>
            }
          </>
        )}
      </div>
      {!grid ? <hr style={{ width: '90%', opacity: 0.1 }} /> : ''}
    </>
  )

  async function handlePlay() {
    if (!isInstalled) {
      await handleInstall({
        appName,
        isInstalling,
        installPath: 'another',
        handleGameStatus,
        t,
      })
      return
    }
    if (status === 'playing' || status === 'updating') {
      handleGameStatus({ appName, status: 'done' })
      return sendKill(appName)
    }

    console.log('play?', appName, status)
    handleGameStatus({ appName, status: 'playing' })
    await launch(appName).then(async (err: string | string[]) => {
      if (!err) {
        return
      }
      if (err.includes('ERROR: Game is out of date')) {
        const { response } = await showMessageBox({
          title: t('box.update.title'),
          message: t('box.update.message'),
          buttons: [t('box.yes'), t('box.no')],
        })

        if (response === 0) {
          handleGameStatus({ appName, status: 'updating' })
          await updateGame(appName)
          return handleGameStatus({ appName, status: 'done' })
        }
        handleGameStatus({ appName, status: 'playing' })
        await launch(`${appName} --skip-version-check`)
        return handleGameStatus({ appName, status: 'done' })
      }
    })

    return handleGameStatus({ appName, status: 'done' })
  }
}

export default GameCard
