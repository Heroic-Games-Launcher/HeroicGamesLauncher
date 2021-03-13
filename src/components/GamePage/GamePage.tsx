import '../../App.css'

/* eslint-disable complexity */
import React, { Fragment, useContext, useEffect, useState } from 'react'

import { IpcRenderer, Remote } from 'electron'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import Settings from '@material-ui/icons/Settings'

import {
  fixSaveFolder,
  getGameInfo,
  getProgress,
  handleStopInstallation,
  importGame,
  install,
  launch,
  legendary,
  sendKill,
  syncSaves,
  updateGame,
} from '../../helper'
import ContextProvider from '../../state/ContextProvider'
import { AppSettings, Game, GameStatus, InstallProgress } from '../../types'
import Header from '../UI/Header'
import InfoBox from '../UI/InfoBox'
import UpdateComponent from '../UI/UpdateComponent'
import GamesSubmenu from './GamesSubmenu'

const { ipcRenderer, remote } = window.require('electron') as {
  ipcRenderer: IpcRenderer
  remote: Remote
}
const {
  dialog: { showOpenDialog, showMessageBox },
} = remote

// This component is becoming really complex and it needs to be refactored in smaller ones

interface RouteParams {
  appName: string
}

export default function GamePage(): JSX.Element | null {
  const { appName } = useParams() as RouteParams
  const { t } = useTranslation('gamepage')
  const {
    refresh,
    libraryStatus,
    handleGameStatus,
    data,
    gameUpdates,
  } = useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}

  const [gameInfo, setGameInfo] = useState({} as Game)
  const [progress, setProgress] = useState({
    percent: '0.00%',
    bytes: '0/0MB',
    eta: '00:00:00',
  } as InstallProgress)
  const [installPath, setInstallPath] = useState('default')
  const [defaultPath, setDefaultPath] = useState('...')
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
        const isProton = wineVersion?.name?.includes('Proton') || false
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
  }, [isInstalling, isPlaying, appName, data])

  useEffect(() => {
    ipcRenderer
      .invoke('requestSettings', 'default')
      .then((config: AppSettings) => setDefaultPath(config.defaultInstallPath))
    return () => {
      ipcRenderer.removeAllListeners('requestSettings')
    }
  }, [appName])

  useEffect(() => {
    const progressInterval = setInterval(async () => {
      if (isInstalling || isUpdating || isReparing) {
        const progress = await ipcRenderer.invoke(
          'requestGameProgress',
          appName
        )

        if (progress) {
          setProgress(progress)
        }

        handleGameStatus({
          appName,
          status,
          progress: getProgress(progress),
        })
      }
    }, 1500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, isUpdating, appName, isReparing])

  const hasUpdate = gameUpdates.includes(appName)

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

    /* 
    Other Keys:
    t('box.stopInstall.title')
    t('box.stopInstall.message')
    t('box.stopInstall.keepInstalling') 
    */

    return (
      <>
        <Header goTo={'/'} renderBackButton />
        <div className="gameConfigContainer">
          {title ? (
            <>
              <Settings
                onClick={() => setClicked(!clicked)}
                className="material-icons is-secondary dots"
              />
              <GamesSubmenu
                appName={appName}
                clicked={clicked}
                isInstalled={isInstalled}
                title={title}
              />
              <div className="gameConfig">
                <div className="gamePicture">
                  <img
                    alt="cover-art"
                    src={`${art_square}?h=400&resize=1&w=300`}
                    className="gameImg"
                  />
                  {art_logo && (
                    <img
                      alt="cover-art"
                      src={`${art_logo}?h=100&resize=1&w=200`}
                      className="gameLogo"
                    />
                  )}
                </div>
                <div className="gameInfo">
                  <div className="title">{title}</div>
                  <div className="infoWrapper">
                    <div className="developer">{developer}</div>
                    <div className="summary">
                      {extraInfo && extraInfo.about
                        ? extraInfo.about.shortDescription
                          ? extraInfo.about.shortDescription
                          : extraInfo.about.description
                          ? extraInfo.about.description
                          : ''
                        : ''}
                    </div>
                    {cloudSaveEnabled && (
                      <div
                        style={{
                          color: autoSyncSaves ? '#07C5EF' : '',
                        }}
                      >
                        {t('info.syncsaves')}:{' '}
                        {autoSyncSaves ? t('enabled') : t('disabled')}
                      </div>
                    )}
                    {isInstalled && (
                      <>
                        <div>
                          {t('info.size')}: {install_size}
                        </div>
                        <div>
                          {t('info.version')}: {version}
                        </div>
                        <div
                          className="clickable"
                          onClick={() =>
                            ipcRenderer.send('openFolder', install_path)
                          }
                        >
                          {t('info.path')}: {install_path}
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
                      <option value={'default'}>{`${t(
                        'install.default'
                      )} ${defaultPath.replaceAll("'", '')}`}</option>
                      <option value={'another'}>{t('install.another')}</option>
                      <option value={'import'}>{t('install.import')}</option>
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
                  <div className="requirements">
                    {extraInfo.reqs && (
                      <InfoBox text="infobox.requirements">
                        <table>
                          <tbody>
                            <tr>
                              <td className="specs"></td>
                              <td className="specs">
                                {t('specs.minimum').toUpperCase()}
                              </td>
                              <td className="specs">
                                {t('specs.recommended').toUpperCase()}
                              </td>
                            </tr>
                            {extraInfo.reqs.map((e) => (
                              <Fragment key={e.title}>
                                <tr>
                                  <td>
                                    <span className="title">
                                      {e.title.toUpperCase()}:
                                    </span>
                                  </td>
                                  <td>
                                    <span className="text">{e.minimum}</span>
                                  </td>
                                  <td>
                                    <span className="text">
                                      {e.recommended}
                                    </span>
                                  </td>
                                </tr>
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </InfoBox>
                    )}
                  </div>
                </div>
              </div>{' '}
            </>
          ) : (
            <UpdateComponent />
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
      return t('label.cancel.update')
    }
    if (isSyncing) {
      return t('label.saves.syncing')
    }

    return isPlaying ? t('label.playing.stop') : t('label.playing.start')
  }

  function getInstallLabel(isInstalled: boolean): React.ReactNode {
    const { eta, bytes, percent } = progress
    if (isReparing) {
      return `${t('status.reparing')} ${percent ? `${percent}` : '...'}`
    }

    if (isMoving) {
      return `${t('status.moving')}`
    }

    if (isUpdating && isInstalled) {
      return `${t('status.updating')} ${
        percent ? `${percent} [${bytes}] | ETA: ${eta}` : '...'
      }`
    }

    if (!isUpdating && isInstalling) {
      return `${t('status.installing')} ${
        percent ? `${percent} [${bytes}] | ETA: ${eta}` : '...'
      }`
    }

    if (hasUpdate) {
      return `${t('status.installed')} - ${t(
        'status.hasUpdates',
        'New Version Available!'
      )}`
    }

    if (isInstalled) {
      return t('status.installed')
    }

    return t('status.notinstalled')
  }

  function getButtonClass(isInstalled: boolean) {
    if (isInstalled || isInstalling) {
      return 'is-danger'
    }
    return 'is-primary'
  }

  function getButtonLabel(isInstalled: boolean) {
    if (installPath === 'import') {
      return t('button.import')
    }
    if (isInstalled) {
      return t('button.uninstall')
    }
    if (isInstalling) {
      return t('button.cancel')
    }
    return t('button.install')
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

      await handleGameStatus({ appName, status: 'playing' })
      await launch(appName).then(
        async (err: void | string): Promise<void> => {
          if (!err) {
            return
          }
          if (
            typeof err === 'string' &&
            err.includes('ERROR: Game is out of date')
          ) {
            const { response } = await showMessageBox({
              title: t('box.update.title'),
              message: t('box.update.message'),
              buttons: [t('box.yes'), t('box.no')],
            })

            if (response === 0) {
              await handleGameStatus({ appName, status: 'done' })
              handleGameStatus({ appName, status: 'updating' })
              await updateGame(appName)
              return handleGameStatus({ appName, status: 'done' })
            }
            handleGameStatus({ appName, status: 'playing' })
            await launch(`${appName} --skip-version-check`)
            return handleGameStatus({ appName, status: 'done' })
          }
        }
      )

      if (autoSyncSaves) {
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }

      return handleGameStatus({ appName, status: 'done' })
    }
  }

  function handleInstall(
    isInstalled: boolean
  ): () => Promise<void | NodeJS.Timeout> {
    return async () => {
      if (isInstalling) {
        const { folderName } = await getGameInfo(appName)
        return handleStopInstallation(appName, [installPath, folderName], t)
      }

      if (isInstalled) {
        await handleUninstall()
        return refresh()
      }

      if (installPath === 'default') {
        const path = 'default'
        await handleGameStatus({ appName, status: 'installing' })
        await install({ appName, path })

        // Wait to be 100% finished
        return setTimeout(() => {
          handleGameStatus({ appName, status: 'done' })
        }, 500)
      }

      if (installPath === 'import') {
        const { filePaths } = await showOpenDialog({
          title: t('box.importpath'),
          buttonLabel: t('box.choose'),
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
          title: t('box.installpath'),
          buttonLabel: t('box.choose'),
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
          }, 500)
        }
      }
    }
  }

  async function handleUninstall() {
    const { response } = await showMessageBox({
      type: 'warning',
      title: t('box.uninstall.title'),
      message: t('box.uninstall.message'),
      buttons: [t('box.yes'), t('box.no')],
    })

    if (response === 0) {
      handleGameStatus({ appName, status: 'uninstalling' })
      await legendary(`uninstall ${appName} -y`)
      return handleGameStatus({ appName, status: 'done' })
    }
    return
  }
}
