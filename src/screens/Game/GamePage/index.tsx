import './index.css'

import { AppSettings, GameInfo, GameStatus, InstallProgress } from 'src/types'
import { IpcRenderer, Remote } from 'electron'
/* eslint-disable complexity */
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
  updateGame
} from 'src/helpers'
import React, { Fragment, useContext, useEffect, useState } from 'react'

import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import GamesSubmenu from '../GameSubMenu'
import Header from 'src/components/UI/Header'
import InfoBox from 'src/components/UI/InfoBox'
import Settings from '@material-ui/icons/Settings'
import UpdateComponent from 'src/components/UI/UpdateComponent'

const { ipcRenderer, remote } = window.require('electron') as {
  ipcRenderer: IpcRenderer
  remote: Remote
}
const {
  dialog: { showOpenDialog, showMessageBox }
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
    gameUpdates
  } = useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}

  const [gameInfo, setGameInfo] = useState({} as GameInfo)
  const [progress, setProgress] = useState({
    bytes: '0.00MiB',
    eta: '00:00:00',
    percent: '0.00%'
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
      if (newInfo.cloud_save_enabled) {
        const {
          autoSyncSaves,
          winePrefix,
          wineVersion,
          savesPath
        }: AppSettings = await ipcRenderer.invoke('requestSettings', appName)
        const isProton = wineVersion?.name?.includes('Proton') || false
        setAutoSyncSaves(autoSyncSaves)
        const folder = await fixSaveFolder(
          newInfo.save_folder,
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
          progress: getProgress(progress),
          status
        })
      }
    }, 1500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, isUpdating, appName, isReparing])

  const hasUpdate = gameUpdates.includes(appName)

  if (gameInfo && gameInfo.install) {
    const {
      title,
      art_square,
      art_logo,
      install : {
        install_path,
        install_size,
        version
      },
      is_installed,
      extra,
      developer,
      cloud_save_enabled
    }: GameInfo = gameInfo

    if (savesPath.includes('{InstallDir}')) {
      // a little hack to stop ESLint from screaming about install_path being null.
      setSavesPath(savesPath.replace('{InstallDir}', `${install_path}`))
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
                isInstalled={is_installed}
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
                      {extra && extra.about
                        ? extra.about.shortDescription
                          ? extra.about.shortDescription
                          : extra.about.description
                            ? extra.about.description
                            : ''
                        : ''}
                    </div>
                    {cloud_save_enabled && (
                      <div
                        style={{
                          color: autoSyncSaves ? '#07C5EF' : ''
                        }}
                      >
                        {t('info.syncsaves')}:{' '}
                        {autoSyncSaves ? t('enabled') : t('disabled')}
                      </div>
                    )}
                    {is_installed && (
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
                        color:
                          is_installed || isInstalling ? '#0BD58C' : '#BD0A0A',
                        fontStyle: 'italic'
                      }}
                    >
                      {getInstallLabel(is_installed)}
                    </p>
                  </div>
                  {!is_installed && !isInstalling && (
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
                    {is_installed && (
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
                      onClick={handleInstall(is_installed)}
                      disabled={
                        isPlaying || isUpdating || isReparing || isMoving
                      }
                      className={`button ${getButtonClass(is_installed)}`}
                    >
                      {`${getButtonLabel(is_installed)}`}
                    </button>
                  </div>
                  <div className="requirements">
                    {extra.reqs && (
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
                            {extra.reqs.map((e) => (
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

  function getInstallLabel(is_installed: boolean): React.ReactNode {
    const { eta, bytes, percent } = progress
    if (isReparing) {
      return `${t('status.reparing')} ${percent ? `${percent}` : '...'}`
    }

    if (isMoving) {
      return `${t('status.moving')}`
    }

    if (isUpdating && is_installed) {
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

    if (is_installed) {
      return t('status.installed')
    }

    return t('status.notinstalled')
  }

  function getButtonClass(is_installed: boolean) {
    if (is_installed || isInstalling) {
      return 'is-danger'
    }
    return 'is-primary'
  }

  function getButtonLabel(is_installed: boolean) {
    if (installPath === 'import') {
      return t('button.import')
    }
    if (is_installed) {
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
              buttons: [t('box.yes'), t('box.no')],
              message: t('box.update.message'),
              title: t('box.update.title')
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
    is_installed: boolean
  ): () => Promise<void | NodeJS.Timeout> {
    return async () => {
      if (isInstalling) {
        const { folder_name } = await getGameInfo(appName)
        return handleStopInstallation(appName, [installPath, folder_name], t)
      }

      if (is_installed) {
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
          buttonLabel: t('box.choose'),
          properties: ['openDirectory'],
          title: t('box.importpath')
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
          buttonLabel: t('box.choose'),
          properties: ['openDirectory'],
          title: t('box.installpath')
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
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.uninstall.message'),
      title: t('box.uninstall.title'),
      type: 'warning'
    })

    if (response === 0) {
      handleGameStatus({ appName, status: 'uninstalling' })
      await legendary(`uninstall ${appName} -y`)
      return handleGameStatus({ appName, status: 'done' })
    }
    return
  }
}
