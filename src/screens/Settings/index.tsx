import './index.css'

import React, { useContext, useEffect, useState } from 'react'
import classNames from 'classnames'

import { AppSettings, Runner, WineInstallation } from 'src/types'
import { Clipboard, IpcRenderer } from 'electron'
import { NavLink, useLocation, useParams } from 'react-router-dom'
import { getGameInfo, getPlatform, writeConfig } from 'src/helpers'
import { useToggle } from 'src/hooks'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWindows, faApple, faLinux } from '@fortawesome/free-brands-svg-icons'
import {
  ContentCopyOutlined,
  CleaningServicesOutlined,
  DeleteOutline
} from '@mui/icons-material'
import ContextProvider from 'src/state/ContextProvider'
import UpdateComponent from 'src/components/UI/UpdateComponent'

import GeneralSettings from './components/GeneralSettings'
import OtherSettings from './components/OtherSettings'
import SyncSaves from './components/SyncSaves'
import Tools from './components/Tools'
import WineSettings from './components/WineSettings'
import LogSettings from './components/LogSettings'

interface ElectronProps {
  ipcRenderer: IpcRenderer
  clipboard: Clipboard
}

const { ipcRenderer, clipboard } = window.require('electron') as ElectronProps
const storage: Storage = window.localStorage
interface RouteParams {
  appName: string
  type: string
}

interface LocationState {
  fromGameCard: boolean
  runner: Runner
}

function Settings() {
  const { t, i18n } = useTranslation()
  const { state } = useLocation() as { state: LocationState }
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  const [wineVersion, setWineVersion] = useState({
    bin: '/usr/bin/wine',
    name: 'Wine Default'
  } as WineInstallation)
  const [winePrefix, setWinePrefix] = useState('~/.wine')
  const [wineCrossoverBottle, setWineCrossoverBottle] = useState('Heroic')
  const [defaultInstallPath, setDefaultInstallPath] = useState('')
  const [defaultWinePrefix, setDefaultWinePrefix] = useState('')
  const [targetExe, setTargetExe] = useState('')
  const [otherOptions, setOtherOptions] = useState('')
  const [launcherArgs, setLauncherArgs] = useState('')
  const [egsLinkedPath, setEgsLinkedPath] = useState('')
  const [title, setTitle] = useState('')
  const [maxWorkers, setMaxWorkers] = useState(0)
  const [maxRecentGames, setMaxRecentGames] = useState(5)
  const [maxSharpness, setFsrSharpness] = useState(5)
  const [egsPath, setEgsPath] = useState(egsLinkedPath)
  const [altLegendaryBin, setAltLegendaryBin] = useState('')
  const [language, setLanguage] = useState(
    () => storage.getItem('language') || 'en'
  )
  const [customWinePaths, setCustomWinePaths] = useState([] as Array<string>)
  const [savesPath, setSavesPath] = useState('')

  const {
    on: addDesktopShortcuts,
    toggle: toggleAddDesktopShortcuts,
    setOn: setAddDesktopShortcuts
  } = useToggle(false)
  const {
    on: addStartMenuShortcuts,
    toggle: toggleAddGamesToStartMenu,
    setOn: setAddGamesToStartMenu
  } = useToggle(false)
  const {
    on: useGameMode,
    toggle: toggleUseGameMode,
    setOn: setUseGameMode
  } = useToggle(false)
  const {
    on: checkForUpdatesOnStartup,
    toggle: toggleCheckForUpdatesOnStartup,
    setOn: setCheckForUpdatesOnStartup
  } = useToggle(false)
  const {
    on: nvidiaPrime,
    toggle: toggleNvidiaPrime,
    setOn: setUseNvidiaPrime
  } = useToggle(false)
  const { on: showFps, toggle: toggleFps, setOn: setShowFps } = useToggle(false)
  const {
    on: offlineMode,
    toggle: toggleOffline,
    setOn: setShowOffline
  } = useToggle(false)
  const {
    on: audioFix,
    toggle: toggleAudioFix,
    setOn: setAudioFix
  } = useToggle(false)
  const {
    on: showMangohud,
    toggle: toggleMangoHud,
    setOn: setShowMangoHud
  } = useToggle(false)
  const {
    on: exitToTray,
    toggle: toggleTray,
    setOn: setExitToTray
  } = useToggle(false)
  const {
    on: startInTray,
    toggle: toggleStartInTray,
    setOn: setStartInTray
  } = useToggle(false)
  const {
    on: darkTrayIcon,
    toggle: toggleDarkTrayIcon,
    setOn: setDarkTrayIcon
  } = useToggle(false)
  const {
    on: discordRPC,
    toggle: toggleDiscordRPC,
    setOn: setDiscordRPC
  } = useToggle(false)
  const {
    on: autoInstallDxvk,
    toggle: toggleAutoInstallDxvk,
    setOn: setAutoInstallDxvk
  } = useToggle(false)
  const {
    on: autoInstallVkd3d,
    toggle: toggleAutoInstallVkd3d,
    setOn: setAutoInstallVkd3d
  } = useToggle(false)
  const {
    on: enableFSR,
    toggle: toggleFSR,
    setOn: setEnableFSR
  } = useToggle(false)
  const {
    on: enableResizableBar,
    toggle: toggleResizableBar,
    setOn: setResizableBar
  } = useToggle(false)
  const {
    on: enableEsync,
    toggle: toggleEsync,
    setOn: setEnableEsync
  } = useToggle(false)
  const {
    on: enableFsync,
    toggle: toggleFsync,
    setOn: setEnableFsync
  } = useToggle(false)
  const {
    on: showUnrealMarket,
    toggle: toggleUnrealMarket,
    setOn: setShowUnrealMarket
  } = useToggle(false)

  const [haveCloudSaving, setHaveCloudSaving] = useState({
    cloudSaveEnabled: false,
    saveFolder: ''
  })
  const [autoSyncSaves, setAutoSyncSaves] = useState(false)
  const [altWine, setAltWine] = useState([] as WineInstallation[])

  const [isMacNative, setIsMacNative] = useState(false)
  const [isLinuxNative, setIsLinuxNative] = useState(false)

  const [isCopiedToClipboard, setCopiedToClipboard] = useState(false)

  const { appName, type } = useParams() as RouteParams
  const isDefault = appName === 'default'
  const isGeneralSettings = type === 'general'
  const isWineSettings = type === 'wine'
  const isSyncSettings = type === 'sync'
  const isOtherSettings = type === 'other'
  const isLogSettings = type === 'log'

  useEffect(() => {
    const getSettings = async () => {
      const config: AppSettings = await ipcRenderer.invoke(
        'requestSettings',
        appName
      )
      setAutoSyncSaves(config.autoSyncSaves || false)
      setUseGameMode(config.useGameMode || false)
      setShowFps(config.showFps || false)
      setShowOffline(config.offlineMode || false)
      setAudioFix(config.audioFix || false)
      setShowMangoHud(config.showMangohud || false)
      setDefaultInstallPath(config.defaultInstallPath)
      setWineVersion(config.wineVersion)
      setWinePrefix(config.winePrefix)
      setWineCrossoverBottle(config.wineCrossoverBottle)
      setOtherOptions(config.otherOptions)
      setLauncherArgs(config.launcherArgs)
      setUseNvidiaPrime(config.nvidiaPrime || false)
      setEgsLinkedPath(config.egsLinkedPath || '')
      setEgsPath(config.egsLinkedPath || '')
      setExitToTray(config.exitToTray || false)
      setStartInTray(config.startInTray || false)
      setDarkTrayIcon(config.darkTrayIcon || false)
      setDiscordRPC(config.discordRPC || false)
      setAutoInstallDxvk(config.autoInstallDxvk || false)
      setAutoInstallVkd3d(config.autoInstallVkd3d || false)
      setEnableEsync(config.enableEsync || false)
      setEnableFsync(config.enableFsync || false)
      setEnableFSR(config.enableFSR || false)
      setFsrSharpness(config.maxSharpness || 2)
      setResizableBar(config.enableResizableBar || false)
      setSavesPath(config.savesPath || '')
      setMaxWorkers(config.maxWorkers ?? 0)
      setMaxRecentGames(config.maxRecentGames ?? 5)
      setCustomWinePaths(config.customWinePaths || [])
      setAddDesktopShortcuts(config.addDesktopShortcuts || false)
      setAddGamesToStartMenu(config.addStartMenuShortcuts || false)
      setCustomWinePaths(config.customWinePaths || [])
      setCheckForUpdatesOnStartup(config.checkForUpdatesOnStartup || true)
      setTargetExe(config.targetExe || '')
      setAltLegendaryBin(config.altLegendaryBin || '')
      setShowUnrealMarket(config.showUnrealMarket || false)
      setDefaultWinePrefix(config.defaultWinePrefix)

      if (!isDefault) {
        const newInfo = await getGameInfo(appName, state.runner)
        const {
          cloud_save_enabled: cloudSaveEnabled,
          save_folder: saveFolder,
          title: gameTitle,
          is_mac_native,
          is_linux_native
        } = newInfo
        setTitle(gameTitle)
        setIsMacNative(is_mac_native && (await getPlatform()) == 'darwin')
        setIsLinuxNative(is_linux_native && (await getPlatform()) == 'linux')
        return setHaveCloudSaving({ cloudSaveEnabled, saveFolder })
      }
      return setTitle(t('globalSettings', 'Global Settings'))
    }
    getSettings()

    return () => {
      ipcRenderer.removeAllListeners('requestSettings')
    }
  }, [appName, type, isDefault, i18n.language])

  const GlobalSettings = {
    altLegendaryBin,
    addDesktopShortcuts,
    addStartMenuShortcuts,
    audioFix,
    autoInstallDxvk,
    autoInstallVkd3d,
    checkForUpdatesOnStartup,
    customWinePaths,
    darkTrayIcon,
    defaultInstallPath,
    defaultWinePrefix,
    discordRPC,
    egsLinkedPath,
    enableEsync,
    enableFsync,
    exitToTray,
    language,
    maxRecentGames,
    maxWorkers,
    nvidiaPrime,
    offlineMode,
    otherOptions,
    showFps,
    showMangohud,
    showUnrealMarket,
    startInTray,
    useGameMode,
    wineCrossoverBottle,
    winePrefix,
    wineVersion
  } as AppSettings

  const GameSettings = {
    audioFix,
    autoInstallDxvk,
    autoInstallVkd3d,
    autoSyncSaves,
    enableEsync,
    enableFSR,
    enableFsync,
    maxSharpness,
    enableResizableBar,
    launcherArgs,
    nvidiaPrime,
    offlineMode,
    otherOptions,
    savesPath,
    showFps,
    showMangohud,
    targetExe,
    useGameMode,
    wineCrossoverBottle,
    winePrefix,
    wineVersion
  } as AppSettings

  const settingsToSave = isDefault ? GlobalSettings : GameSettings
  const shouldRenderWineSettings = !isWin && !isMacNative && !isLinuxNative
  let returnPath: string | null = '/'
  if (state && !state.fromGameCard) {
    returnPath = `/gameconfig/${appName}`
  }

  useEffect(() => {
    writeConfig([appName, settingsToSave])
  }, [GlobalSettings, GameSettings, appName])

  useEffect(() => {
    // set copied to clipboard status to true if it's not already set to true
    // used for changing text and color
    if (!isCopiedToClipboard) return

    const timer = setTimeout(() => {
      setCopiedToClipboard(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isCopiedToClipboard])

  if (!title) {
    return <UpdateComponent />
  }

  return (
    <>
      <div className="Settings">
        <div className="settingsNavbar">
          {isDefault && (
            <NavLink to={{ pathname: '/settings/default/general' }}>
              {t('settings.navbar.general')}
            </NavLink>
          )}
          {shouldRenderWineSettings && (
            <NavLink to={{ pathname: `/settings/${appName}/wine` }}>
              Wine
            </NavLink>
          )}
          {!isDefault && haveCloudSaving.cloudSaveEnabled && (
            <NavLink
              data-testid="linkSync"
              to={{ pathname: `/settings/${appName}/sync` }}
            >
              {t('settings.navbar.sync')}
            </NavLink>
          )}
          {
            <NavLink to={{ pathname: `/settings/${appName}/other` }}>
              {t('settings.navbar.other')}
            </NavLink>
          }
          {
            <NavLink to={{ pathname: `/settings/${appName}/log` }}>
              {t('settings.navbar.log', 'Log')}
            </NavLink>
          }
        </div>
        <div className="settingsWrapper">
          {title && (
            <NavLink
              to={returnPath}
              className="headerTitle"
              data-testid="headerTitle"
            >
              {title}
              {!isDefault && (
                <FontAwesomeIcon
                  icon={
                    isMacNative ? faApple : isLinuxNative ? faLinux : faWindows
                  }
                />
              )}
            </NavLink>
          )}
          {isGeneralSettings && (
            <GeneralSettings
              egsPath={egsPath}
              setEgsPath={setEgsPath}
              egsLinkedPath={egsLinkedPath}
              setEgsLinkedPath={setEgsLinkedPath}
              defaultInstallPath={defaultInstallPath}
              setDefaultInstallPath={setDefaultInstallPath}
              exitToTray={exitToTray}
              startInTray={startInTray}
              toggleTray={toggleTray}
              toggleStartInTray={toggleStartInTray}
              language={language}
              setLanguage={setLanguage}
              maxWorkers={maxWorkers}
              setMaxWorkers={setMaxWorkers}
              toggleDarkTrayIcon={toggleDarkTrayIcon}
              darkTrayIcon={darkTrayIcon}
              toggleCheckUpdatesOnStartup={toggleCheckForUpdatesOnStartup}
              checkForUpdatesOnStartup={checkForUpdatesOnStartup}
              altLegendaryBin={altLegendaryBin}
              setAltLegendaryBin={setAltLegendaryBin}
              toggleUnrealMarket={toggleUnrealMarket}
              showUnrealMarket={showUnrealMarket}
            />
          )}
          {isGeneralSettings && (
            <div className="footerFlex">
              <button
                className={classNames('button', 'is-footer', {
                  isSuccess: isCopiedToClipboard
                })}
                onClick={() => {
                  clipboard.writeText(
                    JSON.stringify({ appName, title, ...settingsToSave })
                  )
                  setCopiedToClipboard(true)
                }}
              >
                <div className="button-icontext-flex">
                  <div className="button-icon-flex">
                    <ContentCopyOutlined />
                  </div>
                  <span className="button-icon-text">
                    {isCopiedToClipboard
                      ? t('settings.copiedToClipboard', 'Copied to Clipboard!')
                      : t(
                          'settings.copyToClipboard',
                          'Copy All Settings to Clipboard'
                        )}
                  </span>
                </div>
              </button>
              {isDefault && (
                <>
                  <button
                    className="button is-footer is-danger"
                    onClick={() => ipcRenderer.send('clearCache')}
                  >
                    <div className="button-icontext-flex">
                      <div className="button-icon-flex">
                        <CleaningServicesOutlined />
                      </div>
                      <span className="button-icon-text">
                        {t('settings.clear-cache', 'Clear Heroic Cache')}
                      </span>
                    </div>
                  </button>

                  <button
                    className="button is-footer is-danger"
                    onClick={() => ipcRenderer.send('resetHeroic')}
                  >
                    <div className="button-icontext-flex">
                      <div className="button-icon-flex">
                        <DeleteOutline />
                      </div>
                      <span className="button-icon-text">
                        {t('settings.reset-heroic', 'Reset Heroic')}
                      </span>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
          {isWineSettings && (
            <WineSettings
              altWine={altWine}
              setAltWine={setAltWine}
              wineVersion={wineVersion}
              winePrefix={winePrefix}
              setWineVersion={setWineVersion}
              setWinePrefix={setWinePrefix}
              wineCrossoverBottle={wineCrossoverBottle}
              setWineCrossoverBottle={setWineCrossoverBottle}
              autoInstallDxvk={autoInstallDxvk}
              autoInstallVkd3d={autoInstallVkd3d}
              toggleAutoInstallDxvk={toggleAutoInstallDxvk}
              toggleAutoInstallVkd3d={toggleAutoInstallVkd3d}
              customWinePaths={customWinePaths}
              setCustomWinePaths={setCustomWinePaths}
              isDefault={isDefault}
              enableFSR={enableFSR}
              toggleFSR={toggleFSR}
              enableEsync={enableEsync}
              toggleEsync={toggleEsync}
              enableFsync={enableFsync}
              toggleFsync={toggleFsync}
              defaultWinePrefix={defaultWinePrefix}
              setDefaultWinePrefix={setDefaultWinePrefix}
              maxSharpness={maxSharpness}
              setFsrSharpness={setFsrSharpness}
              enableResizableBar={enableResizableBar}
              toggleResizableBar={toggleResizableBar}
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
              primeRun={nvidiaPrime}
              togglePrimeRun={toggleNvidiaPrime}
              showFps={showFps}
              toggleFps={toggleFps}
              offlineMode={offlineMode}
              toggleOffline={toggleOffline}
              audioFix={audioFix}
              toggleAudioFix={toggleAudioFix}
              showMangohud={showMangohud}
              toggleMangoHud={toggleMangoHud}
              isDefault={isDefault}
              maxRecentGames={maxRecentGames}
              setMaxRecentGames={setMaxRecentGames}
              addDesktopShortcuts={addDesktopShortcuts}
              addGamesToStartMenu={addStartMenuShortcuts}
              toggleAddDesktopShortcuts={toggleAddDesktopShortcuts}
              toggleAddGamesToStartMenu={toggleAddGamesToStartMenu}
              toggleDiscordRPC={toggleDiscordRPC}
              discordRPC={discordRPC}
              targetExe={targetExe}
              setTargetExe={setTargetExe}
              isMacNative={isMacNative}
              isLinuxNative={isLinuxNative}
            />
          )}
          {isSyncSettings && (
            <SyncSaves
              savesPath={savesPath}
              setSavesPath={setSavesPath}
              appName={appName}
              autoSyncSaves={autoSyncSaves}
              setAutoSyncSaves={setAutoSyncSaves}
              isProton={!isWin && wineVersion.name.includes('Proton')}
              winePrefix={winePrefix}
            />
          )}
          {isLogSettings && (
            <LogSettings isDefault={isDefault} appName={appName} />
          )}
          <span className="save">{t('info.settings')}</span>
          {!isDefault && <span className="appName">AppName: {appName}</span>}
        </div>
      </div>
    </>
  )
}

export default React.memo(Settings)
