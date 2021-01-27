import { IpcRendererEvent } from 'electron'
import React, { useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { getGameInfo, writeConfig } from '../../helper'
import { useToggle } from '../../hooks'
import { AppSettings, WineProps } from '../../types'
import Header from '../UI/Header'
import GeneralSettings from './GeneralSettings'
import OtherSettings from './OtherSettings'
import SyncSaves from './SyncSaves'
import Tools from './Tools'
import WineSettings from './WineSettings'

const { ipcRenderer } = window.require('electron')

interface RouteParams {
  appName: string
  type: string
}

// TODO: add option to add Custom wine
// TODO: add feedback when launching winecfg and winetricks

export default function Settings() {
  const [wineVersion, setWineversion] = useState({
    name: 'Wine Default',
    bin: '/usr/bin/wine',
  } as WineProps)
  const [winePrefix, setWinePrefix] = useState('~/.wine')
  const [defaultInstallPath, setDefaultInstallPath] = useState('')
  const [otherOptions, setOtherOptions] = useState('')
  const [launcherArgs, setLauncherArgs] = useState('')
  const [egsLinkedPath, setEgsLinkedPath] = useState('')
  const [egsPath, setEgsPath] = useState(egsLinkedPath)
  const [savesPath, setSavesPath] = useState('')
  const {
    on: useGameMode,
    toggle: toggleUseGameMode,
    setOn: setUseGameMode,
  } = useToggle(false)
  const { on: showFps, toggle: toggleFps, setOn: setShowFps } = useToggle(false)
  const {
    on: audioFix,
    toggle: toggleAudioFix,
    setOn: setAudioFix,
  } = useToggle(false)
  const {
    on: showMangohud,
    toggle: toggleMangoHud,
    setOn: setShowMangoHud,
  } = useToggle(false)
  const {
    on: exitToTray,
    toggle: toggleTray,
    setOn: setExitToTray,
  } = useToggle(false)

  const [haveCloudSaving, setHaveCloudSaving] = useState({
    cloudSaveEnabled: false,
    saveFolder: '',
  })
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [altWine, setAltWine] = useState([] as WineProps[])

  const { appName, type } = useParams() as RouteParams
  const isDefault = appName === 'default'
  const isGeneralSettings = type === 'general'
  const isWineSettings = type === 'wine'
  const isSyncSettings = type === 'sync'
  const isOtherSettings = type === 'other'

  const settings = isDefault ? 'defaultSettings' : appName

  useEffect(() => {
    ipcRenderer.send('requestSettings', appName)
    ipcRenderer.once(
      settings,
      async (event: IpcRendererEvent, config: AppSettings) => {
        setUseGameMode(config.useGameMode || false)
        setShowFps(config.showFps || false)
        setAudioFix(config.audioFix || false)
        setShowMangoHud(config.showMangohud || false)
        setDefaultInstallPath(config.defaultInstallPath)
        setWineversion(config.wineVersion)
        setWinePrefix(config.winePrefix)
        setOtherOptions(config.otherOptions)
        setLauncherArgs(config.launcherArgs)
        setEgsLinkedPath(config.egsLinkedPath || '')
        setEgsPath(config.egsLinkedPath || '')
        setSavesPath(config.savesPath || '')
        setAutoSyncSaves(config.autoSyncSaves)
        setExitToTray(config.exitToTray || false)
        if (!isDefault) {
          const { cloudSaveEnabled, saveFolder } = await getGameInfo(appName)
          setHaveCloudSaving({ cloudSaveEnabled, saveFolder })
        }

        ipcRenderer.send('getAlternativeWine')
        ipcRenderer.on(
          'alternativeWine',
          (event: IpcRendererEvent, args: WineProps[]) => setAltWine(args)
        )
      }
    )
  }, [appName, settings, type, isDefault])

  const GlobalSettings = {
    defaultSettings: {
      defaultInstallPath,
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      egsLinkedPath,
      showFps,
      exitToTray,
      audioFix,
      showMangohud,
    },
  }

  const GameSettings = {
    [appName]: {
      wineVersion,
      winePrefix,
      otherOptions,
      launcherArgs,
      useGameMode,
      savesPath,
      showFps,
      autoSyncSaves,
      audioFix,
      showMangohud,
    },
  }

  const settingsToSave = isDefault ? GlobalSettings : GameSettings
  const returnPath = isDefault ? '/' : `/gameconfig/${appName}`

  useEffect(() => {
    writeConfig([appName, settingsToSave])
  }, [GlobalSettings, GameSettings, appName])

  return (
    <>
      <Header goTo={returnPath} renderBackButton />
      <div className="Settings">
        <div className="settingsNavbar">
          {isDefault && (
            <NavLink to={{ pathname: '/settings/default/general' }}>
              General
            </NavLink>
          )}
          <NavLink to={{ pathname: `/settings/${appName}/wine` }}>Wine</NavLink>
          {!isDefault && haveCloudSaving.cloudSaveEnabled && (
            <NavLink to={{ pathname: `/settings/${appName}/sync` }}>
              Sync
            </NavLink>
          )}
          <NavLink to={{ pathname: `/settings/${appName}/other` }}>
            Other
          </NavLink>
        </div>
        <div className="settingsWrapper">
          {isGeneralSettings && (
            <GeneralSettings
              egsPath={egsPath}
              setEgsPath={setEgsPath}
              egsLinkedPath={egsLinkedPath}
              setEgsLinkedPath={setEgsLinkedPath}
              defaultInstallPath={defaultInstallPath}
              setDefaultInstallPath={setDefaultInstallPath}
              exitToTray={exitToTray}
              toggleTray={toggleTray}
            />
          )}
          {isWineSettings && (
            <WineSettings
              altWine={altWine}
              wineVersion={wineVersion}
              winePrefix={winePrefix}
              setWineversion={setWineversion}
              setWinePrefix={setWinePrefix}
            />
          )}
          {isWineSettings && (
            <Tools winePrefix={winePrefix} wineVersion={wineVersion} />
          )}
          {isOtherSettings && (
            <OtherSettings
              otherOptions={otherOptions}
              setOtherOptions={setOtherOptions}
              launcherArgs={launcherArgs}
              setLauncherArgs={setLauncherArgs}
              useGameMode={useGameMode}
              toggleUseGameMode={toggleUseGameMode}
              showFps={showFps}
              toggleFps={toggleFps}
              audioFix={audioFix}
              toggleAudioFix={toggleAudioFix}
              showMangohud={showMangohud}
              toggleMangoHud={toggleMangoHud}
            />
          )}
          {isSyncSettings && (
            <SyncSaves
              savesPath={savesPath}
              setSavesPath={setSavesPath}
              appName={appName}
              saveFolder={haveCloudSaving.saveFolder}
              autoSyncSaves={autoSyncSaves}
              setAutoSyncSaves={setAutoSyncSaves}
              defaultFolder={winePrefix}
            />
          )}
          <span className="save">Settings are saved automatically</span>
        </div>
      </div>
    </>
  )
}
