import './index.css'

import React, {
  Fragment,
  useContext,
  useEffect,
  useState,
  MouseEvent
} from 'react'

import {
  IpcRenderer
} from 'electron'
import {
  getGameInfo,
  getInstallInfo,
  getProgress,
  install,
  launch,
  sendKill,
  syncSaves
} from 'src/helpers'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import UpdateComponent from 'src/components/UI/UpdateComponent'

import {
  updateGame
} from 'src/helpers'

import {
  AppSettings,
  GameInfo,
  GameStatus,
  InstallInfo,
  InstallProgress
} from 'src/types'

import GamePicture from '../GamePicture'
import TimeContainer from '../TimeContainer'
import prettyBytes from 'pretty-bytes'
import { Checkbox } from '@material-ui/core'
import { SDL_GAMES, SelectiveDownload } from 'src/screens/Library/components/InstallModal/selective_dl'
import GameRequirements from '../GameRequirements'
import { GameSubMenu } from '..'

const storage: Storage = window.localStorage

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

// This component is becoming really complex and it needs to be refactored in smaller ones

interface RouteParams {
  appName: string
}


export default function GamePage(): JSX.Element | null {
  const { appName } = useParams() as RouteParams
  const { t } = useTranslation('gamepage')

  const [ tabToShow, setTabToShow ] = useState('infoTab')

  const {
    libraryStatus,
    handleGameStatus,
    data,
    gameUpdates
  } = useContext(ContextProvider)
  const gameStatus: GameStatus = libraryStatus.filter(
    (game: GameStatus) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}
  const previousProgress = JSON.parse(storage.getItem(appName) || '{}') as InstallProgress

  const [gameInfo, setGameInfo] = useState({} as GameInfo)
  const [progress, setProgress] = useState(previousProgress ?? {
    bytes: '0.00MiB',
    eta: '00:00:00',
    percent: '0.00%'
  } as InstallProgress)
  const [defaultPath, setDefaultPath] = useState('...')
  const [installPath, setInstallPath] = useState('default')
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [savesPath, setSavesPath] = useState('')
  const [launchArguments, setLaunchArguments] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [gameInstallInfo, setGameInstallInfo] = useState({} as InstallInfo)
  const [installDlcs, setInstallDlcs] = useState(false)
  const [showSDL, setShowSDL] = useState(false)

  const haveSDL = Boolean(SDL_GAMES[appName])
  const mandatoryTags: Array<string> =  haveSDL ? SDL_GAMES[appName].filter((el: SelectiveDownload) => el.mandatory).map((el: SelectiveDownload) => el.tags)[0] : []
  const [sdlList, setSdlList] = useState([...mandatoryTags])

  const isInstalling = status === 'installing'
  const isPlaying = status === 'playing'
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const hasDownloads = Boolean(libraryStatus.filter(
    (game) => game.status === 'installing' || game.status === 'updating'
  ).length)

  useEffect(() => {
    const updateConfig = async () => {
      const newInfo = await getGameInfo(appName)
      getInstallInfo(appName)
        .then((info) => setGameInstallInfo(info))
      setGameInfo(newInfo)
      if (newInfo.cloud_save_enabled) {
        try {
          const {
            autoSyncSaves,
            savesPath
          }: AppSettings = await ipcRenderer.invoke('requestSettings', appName)
          setAutoSyncSaves(autoSyncSaves)
          setSavesPath(savesPath)
        } catch (error) {
          ipcRenderer.send('logError', error)
        }
      }
    }
    updateConfig()
  }, [isInstalling, isPlaying, appName, data])

  useEffect(() => {
    ipcRenderer
      .invoke('requestSettings', 'default')
      .then((config: AppSettings) => {
        setDefaultPath(config.defaultInstallPath)
        if (installPath === 'default') {
          setInstallPath(config.defaultInstallPath)
        }
      })
    return () => {
      ipcRenderer.removeAllListeners('requestSettings')
    }
  }, [appName, installPath])

  useEffect(() => {
    const progressInterval = setInterval(async () => {
      if (isInstalling || isUpdating || isReparing) {
        const progress: InstallProgress = await ipcRenderer.invoke(
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

        return await handleGameStatus({
          appName,
          status
        })
      }
    }, 1500)
    return () => clearInterval(progressInterval)
  }, [appName, isInstalling, isUpdating, isReparing])

  async function handleUpdate() {
    await handleGameStatus({ appName, status: 'updating' })
    await updateGame(appName)
    await handleGameStatus({ appName, status: 'done' })
  }

  function handleSdl(tags: Array<string>){
    let updatedList: Array<string> = [...sdlList]
    tags.forEach(tag => {
      if (updatedList.includes(tag)){
        return updatedList = updatedList.filter((tagx) => {
          return tagx !== tag})
      }
      return updatedList.push(tag)
    })
    setSdlList([...updatedList])
  }

  function handleDlcs() {
    setInstallDlcs(!installDlcs)
  }

  const hasUpdate = gameUpdates?.includes(appName)

  if (gameInfo && gameInfo.install) {
    const {
      title,
      art_square,
      install : {
        install_path,
        install_size,
        version
      },
      is_installed,
      is_game,
      compatible_apps,
      extra,
      developer,
      cloud_save_enabled,
      canRunOffline
    }: GameInfo = gameInfo
    const haveDLCs = gameInstallInfo?.game?.owned_dlc?.length > 0
    const haveSDL = Boolean(SDL_GAMES[appName])
    const DLCList = gameInstallInfo?.game?.owned_dlc
    const downloadSize  = gameInstallInfo?.manifest?.download_size && prettyBytes(Number(gameInstallInfo?.manifest?.download_size))
    const installSize  = gameInstallInfo?.manifest?.disk_size && prettyBytes(Number(gameInstallInfo?.manifest?.disk_size))
    const launchOptions  = gameInstallInfo?.game?.launch_options || []

    /*
    Other Keys:
    t('box.stopInstall.title')
    t('box.stopInstall.message')
    t('box.stopInstall.keepInstalling')
    */

    const onTabClick = (event: MouseEvent) => {
      const button = event.target as HTMLButtonElement;
      const tab = button.dataset.tab;
      setTabToShow(`${tab}Tab`);
    }

    return (
      <div className="gameConfigContainer">
        {title ? (
          <>
            <GamePicture art_square={art_square} />
            <div className={`gameTabs ${tabToShow}`}>
              {is_game && (
                <>
                  <nav>
                    <button data-tab="info" onClick={onTabClick}>Info</button>
                    <button data-tab="tools" onClick={onTabClick}>Tools</button>
                    <button data-tab="requirements" onClick={onTabClick}>System Requirements</button>
                  </nav>

                  <div className="gameInfo">
                    <div className="title">{title}</div>
                    <div className="infoWrapper">
                      <div className="developer">{developer}</div>
                      {!is_game && (
                        <div className="compatibleApps">{compatible_apps.join(', ')}</div>
                      )}
                      <div className="summary">
                        {extra && extra.about
                          ? extra.about.shortDescription
                            ? extra.about.shortDescription
                            : extra.about.description
                              ? extra.about.description
                              : ''
                          : ''}
                      </div>
                      {is_installed && cloud_save_enabled && is_game && (
                        <div
                          style={{
                            color: autoSyncSaves ? '#07C5EF' : ''
                          }}
                        >
                          {t('info.syncsaves')}:{' '}
                          {autoSyncSaves ? t('enabled') : t('disabled')}
                        </div>
                      )}
                      {!is_installed && (
                        <>
                          <div>
                            {t('game.downloadSize', 'Download Size')}: {downloadSize ?? '...'}
                          </div>
                          <div>
                            {t('game.installSize', 'Install Size')}: {installSize ?? '...'}
                          </div>
                          {haveDLCs && (<div className="itemContainer">
                            <div className="dlcTitle">{t('dlc.title', 'DLCs')}</div>
                            {DLCList.map(({app_name, title}) => <span key={app_name} className="dlcTitle">{title}</span>)}
                            <span className="checkBox">
                              <Checkbox color='primary' checked={installDlcs} size="small" onChange={() => handleDlcs()} />
                              <span className="itemName">{t('dlc.installDlcs', 'Install all DLCs')}</span>
                            </span>
                          </div>)}
                          {haveSDL && <div className="itemContainer">
                            <p className="sdlTitle" onClick={() => setShowSDL(!showSDL)} >{t('sdl.showList', 'Click to Show/Hide Extra Components')}</p>
                            {showSDL && SDL_GAMES[appName].map(({name, tags, mandatory}: SelectiveDownload) => {
                              const checked = sdlList.includes(tags[0])
                              return !mandatory && (
                                <div key={name} className="checkBox">
                                  <Checkbox className="checkbox" color='primary' size="small" checked={checked}  onChange={() => handleSdl(tags)} />
                                  <span className="itemName">{name}</span>
                                </div>)
                            })}
                          </div>}
                          <br />
                        </>
                      )}
                      {is_installed && (
                        <>
                          <div>
                            {t('info.size')}: {install_size}
                          </div>
                          <div>
                            {t('info.version')}: {version}
                          </div>
                          <div>
                            {t('info.canRunOffline', 'Online Required')}: {t(canRunOffline ? 'box.no' : 'box.yes')}
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
                    <TimeContainer game={appName} />
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
                    {!is_installed && !isInstalling && is_game &&(
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
                    {is_installed && Boolean(launchOptions.length) &&(
                      <>
                        <select
                          onChange={(event) => setLaunchArguments(event.target.value)}
                          value={launchArguments}
                          className="settingSelect"
                        >
                          <option value=''>{t('launch.options', 'Launch Options...')}</option>
                          {launchOptions.map(({name, parameters}) => <option key={parameters} value={parameters}>{name}</option>)}
                        </select>
                      </>
                    )}
                    <div className="buttonsWrapper">
                      {is_installed && is_game && (
                        <>
                          <button
                            disabled={isReparing || isMoving || isUpdating}
                            onClick={handlePlay()}
                            className={`button ${getPlayBtnClass()}`}
                          >
                            {getPlayLabel()}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleInstall()}
                        disabled={
                          isPlaying || isUpdating || isReparing || isMoving || (hasDownloads && !isInstalling)
                        }
                        className={`button ${getButtonClass(is_installed)}`}
                      >
                        {`${getButtonLabel(is_installed)}`}
                      </button>
                    </div>
                  </div>

                  <GameSubMenu appName={appName} isInstalled={is_installed} title={title} />
                  <GameRequirements gameInfo={gameInfo} />
                </>
              )}
            </div>
          </>
        ) : (
          <UpdateComponent />
        )}
      </div>
    )
  }
  return <UpdateComponent />

  function getPlayBtnClass() {
    if (isUpdating) {
      return 'is-danger'
    }
    if (isSyncing) {
      return 'is-primary'
    }
    return isPlaying ? 'is-tertiary' : 'is-primary'
  }

  function getPlayLabel(): React.ReactNode {
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

    const currentProgress = `${percent && bytes && eta ? `${percent} [${bytes}] | ETA: ${eta}` : '...'}`

    if (isUpdating && is_installed) {
      if (eta && eta.includes('verifying')){
        return `${t('status.reparing')}: ${percent} [${bytes}]`
      }
      return `${t('status.updating')} ${currentProgress}`
    }

    if (!isUpdating && isInstalling) {
      return `${t('status.installing')} ${currentProgress}`
    }

    if (hasUpdate) {
      return (
        <span onClick={() => handleUpdate()} className='updateText' >
          {`${t('status.installed')} - ${t(
            'status.hasUpdates',
            'New Version Available!'
          )} (${t('status.clickToUpdate', 'Click to Update')})`}
        </span>
      )
    }

    if (is_installed) {
      return t('status.installed')
    }

    if (previousProgress.folder === installPath) {
      const currentStatus = `${getProgress(previousProgress)}%`
      return `${t('status.totalDownloaded', 'Total Downloaded')} ${currentStatus}`
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
    if (previousProgress.folder === installPath && !isInstalling && !is_installed) {
      return t('button.continue', 'Continue Download')
    }
    if (installPath === 'import' && !is_installed) {
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
      await launch({appName, t, handleGameStatus, launchArguments})

      if (autoSyncSaves) {
        setIsSyncing(true)
        await syncSaves(savesPath, appName)
        setIsSyncing(false)
      }

      return await handleGameStatus({ appName, status: 'done' })
    }
  }

  async function handleInstall(){
    return await install({
      appName,
      handleGameStatus,
      installPath,
      isInstalling,
      previousProgress,
      progress,
      setInstallPath,
      t,
      installDlcs,
      sdlList
    })
  }
}
