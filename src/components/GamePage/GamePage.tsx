import React, { useContext, useEffect, useState } from 'react'
import {
  createNewWindow,
  formatStoreUrl,
  getGameInfo,
  legendary,
  install,
  sendKill,
  importGame,
  launch,
  syncSaves,
  updateGame,
  repair,
  getProgress,
} from '../../helper'
import Header from '../UI/Header'
import '../../App.css'
import { AppSettings, Game, GameStatus, InstallProgress } from '../../types'
import ContextProvider from '../../state/ContextProvider'
import { Link, useParams } from 'react-router-dom'
import Update from '../UI/Update'
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

  const { refresh, libraryStatus, handleGameStatus } = useContext(
    ContextProvider
  )

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
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

  useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName)
      setGameInfo(newInfo)
      if (newInfo.cloudSaveEnabled) {
        ipcRenderer.send('requestSettings', appName)
        ipcRenderer.once(
          appName,
          (event: any, { autoSyncSaves, savesPath }: AppSettings) => {
            setAutoSyncSaves(autoSyncSaves)
            setSavesPath(savesPath)
          }
        )
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
      executable,
      version,
      extraInfo,
      developer,
      cloudSaveEnabled,
      saveFolder,
    }: Game = gameInfo

    const protonDBurl = `https://www.protondb.com/search?q=${title}`

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
              <div className={`more ${clicked ? 'clicked' : ''}`}>
                {isInstalled && (
                  <>
                    <Link
                      className="hidden link"
                      to={{
                        pathname: `/settings/${appName}/wine`,
                      }}
                    >
                      Settings
                    </Link>
                    <span
                      onClick={() => handleRepair(appName)}
                      className="hidden link"
                    >
                      Verify and Repair
                    </span>{' '}
                    <span
                      onClick={() => ipcRenderer.send('getLog', appName)}
                      className="hidden link"
                    >
                      Latest Log
                    </span>
                  </>
                )}
                <span
                  onClick={() => createNewWindow(formatStoreUrl(title))}
                  className="hidden link"
                >
                  Store Page
                </span>
                <span
                  onClick={() => createNewWindow(protonDBurl)}
                  className="hidden link"
                >
                  Check Compatibility
                </span>
              </div>
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
                    <div
                      style={{
                        color: cloudSaveEnabled ? '#07C5EF' : '#5A5E5F',
                      }}
                    >
                      Cloud Save Sync:{' '}
                      {cloudSaveEnabled
                        ? `Supports (${
                            autoSyncSaves
                              ? 'Auto Sync Enabled'
                              : 'Auto Sync Disabled'
                          })`
                        : 'Does not support'}
                    </div>
                    {cloudSaveEnabled && (
                      <div>{`Cloud Sync Folder: ${saveFolder}`}</div>
                    )}
                    {isInstalled && (
                      <>
                        <div>Executable: {executable}</div>
                        <div>Size: {install_size}</div>
                        <div>Version: {version}</div>
                        <div
                          className="clickable"
                          onClick={() =>
                            ipcRenderer.send('openFolder', install_path)
                          }
                        >
                          Location: {install_path} (Click to Open Location)
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
                      {getInstallLabel(isInstalled, isUpdating)}
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
                          disabled={isReparing}
                          onClick={handlePlay()}
                          className={`button ${getPlayBtnClass()}`}
                        >
                          {getPlayLabel()}
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleInstall(isInstalled)}
                      disabled={isPlaying || isUpdating || isReparing}
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

  function getInstallLabel(
    isInstalled: boolean,
    isUpdating: boolean
  ): React.ReactNode {
    const { eta, percent } = progress
    if (isReparing) {
      return `Repairing Game ${percent ? `${percent}` : '...'}`
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
        return sendKill(appName)
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
          await install({ appName, path })
          // Wait to be 100% finished
          return setTimeout(() => {
            handleGameStatus({ appName, status: 'done' })
          }, 1000)
        }
      }
    }
  }

  async function handleRepair(appName: string) {
    const { response } = await showMessageBox({
      title: 'Verify and Repair',
      message:
        'Do you want to try to repair this game. It can take a long time?',
      buttons: ['YES', 'NO'],
    })

    if (response === 1) {
      return
    }

    handleGameStatus({ appName, status: 'repairing' })
    await repair(appName)
    return handleGameStatus({ appName, status: 'done' })
  }
}
