import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getGameInfo,
  legendary,
  install,
  sendKill,
  importGame,
  launch,
  syncSaves,
  updateGame,
  getProgress,
  fixSaveFolder,
  handleStopInstallation,
} from '../../helper'
import Header from '../UI/Header'
import '../../App.css'
import { AppSettings, Game, GameStatus, InstallProgress } from '../../types'
import ContextProvider from '../../state/ContextProvider'
import { useParams } from 'react-router-dom'
import Update from '../UI/Update'
import GamesSubmenu from './GamesSubmenu'
const { ipcRenderer, remote } = window.require('electron')
const {
  dialog: { showOpenDialog, showMessageBox },
} = remote

// This component is becoming really complex and it needs to be refactored in smaller ones

interface RouteParams {
  appName: string
}

export default function GamePage() {
  const { appName } = useParams() as RouteParams
  const { t } = useTranslation()
  const { refresh, libraryStatus, handleGameStatus } = useContext(
    ContextProvider
  )

  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}

  const [gameInfo, setGameInfo] = useState({} as Game)
  const [progress, setProgress] = useState({
    percent: '0.00%',
    bytes: '0/0MB',
  } as InstallProgress)
  const [installPath, setInstallPath] = useState('default')
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [savesPath, setSavesPath] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [clicked, setClicked] = useState(false)

  const isInstalling = status === 'installing'
  const isPlaying = status === 'playing'
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'

  useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName)
      setGameInfo(newInfo)
      if (newInfo.cloudSaveEnabled) {
        const {
          autoSyncSaves,
          winePrefix,
          wineVersion,
          savesPath,
        }: AppSettings = await ipcRenderer.invoke('requestSettings', appName)
        const isProton = wineVersion.name.includes('Proton')
        setAutoSyncSaves(autoSyncSaves)
        const folder = await fixSaveFolder(
          newInfo.saveFolder,
          winePrefix,
          isProton
        )
        setSavesPath(savesPath || folder)
      }
    }
    updateConfig()
  }, [isInstalling, isPlaying, appName])

  useEffect(() => {
    const progressInterval = setInterval(() => {
      if (isInstalling || isUpdating || isReparing) {
        ipcRenderer.send('requestGameProgress', appName)
        ipcRenderer.on(
          `${appName}-progress`,
          (event: any, progress: InstallProgress) => {
            setProgress(progress)

            handleGameStatus({
              appName,
              status,
              progress: getProgress(progress),
            })
          }
        )
      }
    }, 500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, isUpdating, appName, isReparing])

  if (gameInfo) {
    const {
      title,
      art_square,
      art_logo,
      install_path,
      install_size,
      isInstalled,
      version,
      extraInfo,
      developer,
      cloudSaveEnabled,
    }: Game = gameInfo

    if (savesPath.includes('{InstallDir}')) {
      setSavesPath(savesPath.replace('{InstallDir}', install_path))
    }

    return (
      <>
        <Header goTo={'/'} renderBackButton />
        <div className="gameConfigContainer">
          {title ? (
            <>
              <span
                onClick={() => setClicked(!clicked)}
                className="material-icons is-secondary dots"
              >
                more_vertical
              </span>
              <GamesSubmenu
                appName={appName}
                clicked={clicked}
                isInstalled={isInstalled}
                title={title}
              />
              <div className="gameConfig">
                <div className="gamePicture">
                  <img alt="cover-art" src={art_square} className="gameImg" />
                  {art_logo && (
                    <img alt="cover-art" src={art_logo} className="gameLogo" />
                  )}
                </div>
                <div className="gameInfo">
                  <div className="title">{title}</div>
                  <div className="infoWrapper">
                    <div className="developer">{developer}</div>
                    <div className="summary">
                      {extraInfo ? extraInfo.shortDescription : ''}
                    </div>
                    {cloudSaveEnabled && (
                      <div
                        style={{
                          color: autoSyncSaves ? '#07C5EF' : '',
                        }}
                      >
                        Sync Saves: {autoSyncSaves ? 'Enabled' : 'Disabled'}
                      </div>
                    )}
                    {isInstalled && (
                      <>
                        <div>Size: {install_size}</div>
                        <div>Version: {version}</div>
                        <div
                          className="clickable"
                          onClick={() =>
                            ipcRenderer.send('openFolder', install_path)
                          }
                        >
                          Location: {install_path}
                        </div>
                        <br />
                      </>
                    )}
                  </div>
                  <div className="gameStatus">
                    {isInstalling && (
                      <progress
                        className="installProgress"
                        max={100}
                        value={getProgress(progress)}
                      />
                    )}
                    <p
                      style={{
                        fontStyle: 'italic',
                        color:
                          isInstalled || isInstalling ? '#0BD58C' : '#BD0A0A',
                      }}
                    >
                      {getInstallLabel(isInstalled)}
                    </p>
                  </div>
                  {!isInstalled && !isInstalling && (
                    <select
                      onChange={(event) => setInstallPath(event.target.value)}
                      value={installPath}
                      className="settingSelect"
                    >
                      <option value={'default'}>Install on default Path</option>
                      <option value={'another'}>Install on another Path</option>
                      <option value={'import'}>Import Game</option>
                    </select>
                  )}
                  <div className="buttonsWrapper">
                    {isInstalled && (
                      <>
                        <button
                          disabled={isReparing || isMoving}
                          onClick={handlePlay()}
                          className={`button ${getPlayBtnClass()}`}
                        >
                          {getPlayLabel()}
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleInstall(isInstalled)}
                      disabled={
                        isPlaying || isUpdating || isReparing || isMoving
                      }
                      className={`button ${getButtonClass(isInstalled)}`}
                    >
                      {`${getButtonLabel(isInstalled)}`}
                    </button>
                  </div>
                </div>
              </div>{' '}
            </>
          ) : (
            <Update />
          )}
        </div>
      </>
    )
  }
  return null

  function getPlayBtnClass() {
    if (isUpdating) {
      return 'is-danger'
    }
    if (isSyncing) {
      return 'is-primary'
    }
    return isPlaying ? 'is-tertiary' : 'is-success'
  }

  function getPlayLabel(): React.ReactNode {
    if (isUpdating) {
      return 'Cancel Update'
    }
    if (isSyncing) {
      return 'Syncinc Saves'
    }

    return isPlaying ? 'Playing (Stop)' : 'Play Now'
  }

  function getInstallLabel(isInstalled: boolean): React.ReactNode {
    const { eta, percent } = progress
    if (isReparing) {
      return `Repairing Game ${percent ? `${percent}` : '...'}`
    }

    if (isMoving) {
      return `Moving Installation, please wait.`
    }

    if (isUpdating && isInstalling) {
      return `Updating ${percent ? `${percent} | ETA: ${eta}` : '...'}`
    }

    if (!isUpdating && isInstalling) {
      return `Installing ${percent ? `${percent} | ETA: ${eta}` : '...'}`
    }

    if (isInstalled) {
      return 'Installed'
    }

    return 'This game is not installed'
  }

  function getButtonClass(isInstalled: boolean) {
    if (isInstalled || isInstalling) {
      return 'is-danger'
    }
    return 'is-primary'
  }

  function getButtonLabel(isInstalled: boolean) {
    if (installPath === 'import') {
      return 'Import'
    }
    if (isInstalled) {
      return 'Uninstall'
    }
    if (isInstalling) {
      return 'Cancel'
    }
    return 'Install'
  }

  function handlePlay() {
    return async () => {
      if (status === 'playing' || status === 'updating') {
        handleGameStatus({ appName, status: 'done' })
        return sendKill(appName)
      }

      if (autoSyncSaves) {
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }

      handleGameStatus({ appName, status: 'playing' })
      await launch(appName).then(async (err: string | string[]) => {
        if (!err) {
          return
        }
        if (err.includes('ERROR: Game is out of date')) {
          const { response } = await showMessageBox({
            title: 'Game Needs Update',
            message: 'This game has an update, do you wish to update now?',
            buttons: ['YES', 'NO'],
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

      if (autoSyncSaves) {
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }

      return handleGameStatus({ appName, status: 'done' })
    }
  }

  function handleInstall(isInstalled: boolean): any {
    return async () => {
      if (isInstalling) {
        const { folderName } = await getGameInfo(appName)
        return handleStopInstallation(appName, [installPath, folderName])
      }

      if (isInstalled) {
        handleGameStatus({ appName, status: 'uninstalling' })
        await legendary(`uninstall ${appName}`)
        handleGameStatus({ appName, status: 'done' })
        return refresh()
      }

      if (installPath === 'default') {
        const path = 'default'
        handleGameStatus({ appName, status: 'installing' })
        await install({ appName, path })
        // Wait to be 100% finished
        return setTimeout(() => {
          handleGameStatus({ appName, status: 'done' })
        }, 1000)
      }

      if (installPath === 'import') {
        const { filePaths } = await showOpenDialog({
          title: 'Choose Game Folder to import',
          buttonLabel: 'Choose',
          properties: ['openDirectory'],
        })

        if (filePaths[0]) {
          const path = filePaths[0]
          handleGameStatus({ appName, status: 'installing' })
          await importGame({ appName, path })
          return handleGameStatus({ appName, status: 'done' })
        }
      }

      if (installPath === 'another') {
        const { filePaths } = await showOpenDialog({
          title: 'Choose Install Path',
          buttonLabel: 'Choose',
          properties: ['openDirectory'],
        })

        if (filePaths[0]) {
          const path = filePaths[0]
          handleGameStatus({ appName, status: 'installing' })
          setInstallPath(path)
          await install({ appName, path })
          // Wait to be 100% finished
          return setTimeout(() => {
            handleGameStatus({ appName, status: 'done' })
          }, 1000)
        }
      }
    }
  }
}
