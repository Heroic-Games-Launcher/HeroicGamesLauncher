import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ContextProvider from '../../state/ContextProvider'
import { GameStatus } from '../../types'
import { getProgress } from '../../helper'
const { ipcRenderer } = window.require('electron')
interface Card {
  cover: string
  logo: string
  title: string
  appName: string
  isInstalled: boolean
}

interface InstallProgress {
  percent: string
  bytes: string
  eta: string
}

const GameCard = ({ cover, title, appName, isInstalled, logo }: Card) => {
  const [progress, setProgress] = useState({
    percent: '0.00%',
    bytes: '0/0MB',
    eta: '',
  } as InstallProgress)
  const { t } = useTranslation()

  const { libraryStatus } = useContext(ContextProvider)

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
    <Link
      className="gameCard"
      to={{
        pathname: `/gameconfig/${appName}`,
      }}
    >
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
      <img
        alt="cover-art"
        src={cover}
        style={{ filter: isInstalled ? 'none' : `grayscale(${effectPercent})` }}
        className="gameImg"
      />
      <div className="gameTitle">
        <span>{title}</span>
        <i
          className={`material-icons ${
            isInstalled ? 'is-success' : 'is-primary'
          }`}
        >
          {isInstalled ? 'play_circle' : 'get_app'}
        </i>
      </div>
    </Link>
  )
}

export default GameCard
