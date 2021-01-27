import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ContextProvider from '../../state/ContextProvider'
import { GameStatus } from '../../types'
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
}

const GameCard = ({ cover, title, appName, isInstalled, logo }: Card) => {
  const [progress, setProgress] = useState({
    percent: '0.00%',
    bytes: '0/0MB',
  } as InstallProgress)

  const { libraryStatus } = useContext(ContextProvider)

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}
  const isInstalling =
    status === 'installing' || status === 'updating' || status === 'repairing'

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isInstalling) {
        ipcRenderer.send('requestGameProgress', appName)
        ipcRenderer.on(
          `${appName}-progress`,
          (event: any, progress: InstallProgress) => setProgress(progress)
        )
      }
    }, 500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, appName])

  const { percent } = progress
  const effectPercent = isInstalling
    ? `${150 - Number(percent.replace('%', ''))}%`
    : '100%'

  return (
    <Link
      className="gameCard"
      to={{
        pathname: `/gameconfig/${appName}`,
      }}
    >
      {isInstalling && <span className="progress">{percent}</span>}
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
