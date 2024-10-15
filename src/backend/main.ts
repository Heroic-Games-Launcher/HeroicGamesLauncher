import { initImagesCache } from './images_cache'
import { downloadAntiCheatData } from './anticheat/utils'
import {
  AppSettings,
  GameSettings,
  DiskSpaceData,
  StatusPromise,
  GamepadInputEvent,
  Runner
} from 'common/types'
import * as path from 'path'
import {
  BrowserWindow,
  Menu,
  app,
  dialog,
  ipcMain,
  powerSaveBlocker,
  protocol,
  screen,
  clipboard,
  session
} from 'electron'
import 'backend/updater'
import { autoUpdater } from 'electron-updater'
import { cpus } from 'os'
import { existsSync, watch, readdirSync, readFileSync } from 'graceful-fs'
import 'source-map-support/register'

import Backend from 'i18next-fs-backend'
import i18next from 'i18next'
import { join } from 'path'
import { DXVK, Winetricks } from './tools'
import { GameConfig } from './game_config'
import { GlobalConfig } from './config'
import { LegendaryUser } from 'backend/storeManagers/legendary/user'
import { GOGUser } from './storeManagers/gog/user'
import gogPresence from './storeManagers/gog/presence'
import { NileUser } from './storeManagers/nile/user'
import {
  clearCache,
  isEpicServiceOffline,
  handleExit,
  openUrlOrFile,
  resetHeroic,
  showAboutWindow,
  showItemInFolder,
  getFileSize,
  detectVCRedist,
  getLatestReleases,
  getShellPath,
  getCurrentChangelog,
  checkWineBeforeLaunch,
  removeFolder,
  downloadDefaultWine,
  sendGameStatusUpdate
} from './utils'
import { uninstallGameCallback } from './utils/uninstaller'
import {
  configStore,
  discordLink,
  gamesConfigPath,
  heroicGithubURL,
  userHome,
  icon,
  installed,
  kofiPage,
  epicLoginUrl,
  patreonPage,
  sidInfoUrl,
  supportURL,
  tsStore,
  weblateUrl,
  wikiLink,
  fontsStore,
  configPath,
  isSteamDeckGameMode,
  isCLIFullscreen,
  isCLINoGui,
  isFlatpak,
  publicDir,
  wineprefixFAQ,
  customThemesWikiLink,
  createNecessaryFolders,
  fixAsarPath,
  isSnap,
  isWindows,
  isMac
} from './constants'
import { handleProtocol } from './protocol'
import {
  appendGamePlayLog,
  initGamePlayLog,
  initLogger,
  logChangedSetting,
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logsDisabled,
  logWarning,
  stopLogger
} from './logger/logger'
import { gameInfoStore } from 'backend/storeManagers/legendary/electronStores'
import { getFonts } from 'font-list'
import {
  runAfterLaunchScript,
  runBeforeLaunchScript,
  runWineCommand
} from './launcher'
import shlex from 'shlex'
import { initQueue } from './downloadmanager/downloadqueue'
import {
  initOnlineMonitor,
  isOnline,
  runOnceWhenOnline
} from './online_monitor'
import { notify, showDialogBoxModalAuto } from './dialog/dialog'
import { addRecentGame } from './recent_games/recent_games'
import { callAbortController } from './utils/aborthandler/aborthandler'
import { getDefaultSavePath } from './save_sync'
import { initTrayIcon } from './tray_icon/tray_icon'
import {
  createMainWindow,
  getMainWindow,
  isFrameless,
  sendFrontendMessage
} from './main_window'

import * as GOGLibraryManager from 'backend/storeManagers/gog/library'
import {
  getCyberpunkMods,
  getBranchPassword,
  setBranchPassword,
  getGOGPlaytime,
  syncQueuedPlaytimeGOG,
  updateGOGPlaytime
} from 'backend/storeManagers/gog/games'
import { playtimeSyncQueue } from './storeManagers/gog/electronStores'
import * as LegendaryLibraryManager from 'backend/storeManagers/legendary/library'
import {
  autoUpdate,
  gameManagerMap,
  initStoreManagers,
  libraryManagerMap
} from './storeManagers'
import { updateWineVersionInfos } from './wine/manager/utils'
import { addNewApp } from './storeManagers/sideload/library'
import {
  getGameOverride,
  getGameSdl
} from 'backend/storeManagers/legendary/library'

app.commandLine?.appendSwitch('ozone-platform-hint', 'auto')

const { showOpenDialog } = dialog

async function initializeWindow(): Promise<BrowserWindow> {
  createNecessaryFolders()
  configStore.set('userHome', userHome)
  const mainWindow = createMainWindow()

  if ((isSteamDeckGameMode || isCLIFullscreen) && !isCLINoGui) {
    logInfo(
      [
        isSteamDeckGameMode
          ? 'Heroic started via Steam-Deck gamemode.'
          : 'Heroic started with --fullscreen',
        'Switching to fullscreen'
      ],
      LogPrefix.Backend
    )
    mainWindow.setFullScreen(true)
  }

  setTimeout(async () => {
    // Will download Wine if none was found
    const availableWine = await GlobalConfig.get().getAlternativeWine()
    DXVK.getLatest()
    Winetricks.download()
    if (!availableWine.length) {
      downloadDefaultWine()
    }
  }, 2500)

  if (!isWindows && !isCLINoGui) {
    setTimeout(async () => {
      try {
        await updateWineVersionInfos(true)
      } catch (error) {
        logError(error, LogPrefix.Backend)
      }
    }, 5000)
  }

  const globalConf = GlobalConfig.get().getSettings()

  mainWindow.setIcon(icon)
  app.commandLine.appendSwitch('enable-spatial-navigation')

  mainWindow.on('maximize', () => sendFrontendMessage('maximized'))
  mainWindow.on('unmaximize', () => sendFrontendMessage('unmaximized'))
  mainWindow.on('enter-full-screen', () =>
    sendFrontendMessage('fullscreen', true)
  )
  mainWindow.on('leave-full-screen', () =>
    sendFrontendMessage('fullscreen', false)
  )
  mainWindow.on('close', async (e) => {
    e.preventDefault()

    if (!isCLIFullscreen && !isSteamDeckGameMode) {
      // store windows properties
      configStore.set('window-props', {
        ...mainWindow.getBounds(),
        maximized: mainWindow.isMaximized()
      })
    }

    const { exitToTray } = GlobalConfig.get().getSettings()

    if (exitToTray) {
      logInfo('Exitting to tray instead of quitting', LogPrefix.Backend)
      return mainWindow.hide()
    }

    handleExit()
  })

  detectVCRedist(mainWindow)

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    // Open the DevTools.
    mainWindow.webContents.openDevTools()
  } else {
    Menu.setApplicationMenu(null)
    mainWindow.loadFile(join(publicDir, 'index.html'))
    if (globalConf.checkForUpdatesOnStartup) {
      autoUpdater.checkForUpdates()
    }
  }

  // Changelog links workaround
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const pattern = app.isPackaged ? publicDir : 'localhost:5173'
    if (!url.match(pattern)) {
      event.preventDefault()
      openUrlOrFile(url)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const pattern = app.isPackaged ? publicDir : 'localhost:5173'
    return { action: !details.url.match(pattern) ? 'allow' : 'deny' }
  })

  ipcMain.on('setZoomFactor', async (event, zoomFactor) => {
    const factor = processZoomForScreen(parseFloat(zoomFactor))
    mainWindow.webContents.setZoomLevel(factor)
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
  })

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
const gotTheLock = app.requestSingleInstanceLock()
let openUrlArgument = ''

const processZoomForScreen = (zoomFactor: number) => {
  const screenSize = screen.getPrimaryDisplay().workAreaSize.width
  if (screenSize < 1200) {
    const extraDPIZoomIn = screenSize / 1200
    return (zoomFactor * extraDPIZoomIn - 1) / 0.2
  } else {
    return (zoomFactor - 1) / 0.2
  }
}

if (!gotTheLock) {
  logInfo('Heroic is already running, quitting this instance')
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    // Someone tried to run a second instance, we should focus our window.
    const mainWindow = getMainWindow()
    mainWindow?.show()

    handleProtocol(argv)
  })
  app.whenReady().then(async () => {
    initLogger()
    initOnlineMonitor()
    initStoreManagers()
    initImagesCache()

    // Add User-Agent Client hints to behave like Windows
    if (process.argv.includes('--spoof-windows')) {
      session.defaultSession.webRequest.onBeforeSendHeaders(
        (details, callback) => {
          details.requestHeaders['sec-ch-ua-platform'] = 'Windows'
          callback({ cancel: false, requestHeaders: details.requestHeaders })
        }
      )
    }

    // try to fix notification app name on windows
    if (isWindows) {
      app.setAppUserModelId('Heroic Games Launcher')
    }

    runOnceWhenOnline(async () => {
      const isLoggedIn = LegendaryUser.isLoggedIn()

      if (!isLoggedIn) {
        logInfo('User Not Found, removing it from Store', {
          prefix: LogPrefix.Backend,
          forceLog: true
        })
        configStore.delete('userInfo')
      }

      // Update user details
      if (GOGUser.isLoggedIn()) {
        GOGUser.getUserDetails()
      }
    })

    const settings = GlobalConfig.get().getSettings()

    // Make sure lock is not present when starting up
    playtimeSyncQueue.delete('lock')
    if (!settings.disablePlaytimeSync) {
      runOnceWhenOnline(syncQueuedPlaytimeGOG)
    } else {
      logDebug('Skipping playtime sync queue upload - playtime sync disabled', {
        prefix: LogPrefix.Backend
      })
    }
    runOnceWhenOnline(gogPresence.setPresence)
    await i18next.use(Backend).init({
      backend: {
        addPath: path.join(publicDir, 'locales', '{{lng}}', '{{ns}}'),
        allowMultiLoading: false,
        loadPath: path.join(publicDir, 'locales', '{{lng}}', '{{ns}}.json')
      },
      debug: false,
      returnEmptyString: false,
      returnNull: false,
      fallbackLng: 'en',
      lng: settings.language,
      supportedLngs: [
        'ar',
        'az',
        'be',
        'bg',
        'bs',
        'ca',
        'cs',
        'de',
        'el',
        'en',
        'es',
        'et',
        'eu',
        'fa',
        'fi',
        'fr',
        'gl',
        'he',
        'hr',
        'hu',
        'ja',
        'ko',
        'id',
        'it',
        'ml',
        'nb_NO',
        'nl',
        'pl',
        'pt',
        'pt_BR',
        'ro',
        'ru',
        'sr',
        'sk',
        'sv',
        'ta',
        'tr',
        'uk',
        'vi',
        'zh_Hans',
        'zh_Hant'
      ]
    })

    const mainWindow = await initializeWindow()

    protocol.handle('heroic', (request) => {
      handleProtocol([request.url])
      return new Response('Operation initiated.', { status: 201 })
    })
    if (!app.isDefaultProtocolClient('heroic')) {
      if (app.setAsDefaultProtocolClient('heroic')) {
        logInfo('Registered protocol with OS.', LogPrefix.Backend)
      } else {
        logWarning('Failed to register protocol with OS.', LogPrefix.Backend)
      }
    } else {
      logWarning('Protocol already registered.', LogPrefix.Backend)
    }

    const headless = isCLINoGui || settings.startInTray
    if (!headless) {
      mainWindow.once('ready-to-show', () => {
        const props = configStore.get_nodefault('window-props')
        mainWindow.show()
        // Apply maximize only if we show the window
        if (props?.maximized) {
          mainWindow.maximize()
        }
      })
    }

    // set initial zoom level after a moment, if set in sync the value stays as 1
    setTimeout(() => {
      const zoomFactor = processZoomForScreen(
        configStore.get('zoomPercent', 100) / 100
      )

      mainWindow.webContents.setZoomLevel(zoomFactor)
      mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
    }, 200)

    ipcMain.on('changeLanguage', async (event, language) => {
      logInfo(['Changing Language to:', language], LogPrefix.Backend)
      await i18next.changeLanguage(language)
      gameInfoStore.clear()
    })

    downloadAntiCheatData()

    initTrayIcon(mainWindow)

    return
  })
}

ipcMain.on('notify', (event, args) => notify(args))

ipcMain.once('frontendReady', () => {
  logInfo('Frontend Ready', LogPrefix.Backend)
  handleProtocol([openUrlArgument, ...process.argv])

  if (isSnap) {
    const snapWarning: Electron.MessageBoxOptions = {
      title: i18next.t('box.warning.snap.title', 'Heroic is running as a Snap'),
      message: i18next.t('box.warning.snap.message', {
        defaultValue:
          'Some features are not available in the Snap version of the app for now and we are trying to fix it.{{newLine}}Current limitations are: {{newLine}}Heroic will not be able to find Proton from Steam or Wine from Lutris.{{newLine}}{{newLine}}Gamescope, GameMode and MangoHud will also not work since Heroic cannot have access to them.{{newLine}}{{newLine}}To have access to this feature please install Heroic as a Flatpak, DEB or from the AppImage.',
        newLine: '\n'
      }),
      checkboxLabel: i18next.t('box.warning.snap.checkbox', {
        defaultValue: 'Do not show this message again'
      }),
      checkboxChecked: false
    }

    const showSnapWarning = configStore.get('showSnapWarning', true)

    if (showSnapWarning) {
      dialog
        .showMessageBox({
          ...snapWarning
        })
        .then((result) => {
          if (result.checkboxChecked) {
            configStore.set('showSnapWarning', false)
          }
        })
    }
  }

  // skip the download queue if we are running in CLI mode
  if (isCLINoGui) {
    return
  }

  setTimeout(() => {
    logInfo('Starting the Download Queue', LogPrefix.Backend)
    initQueue()
  }, 5000)
})

// Maybe this can help with white screens
process.on('uncaughtException', async (err) => {
  logError(err, LogPrefix.Backend)

  // We might get "object has been destroyed" exceptions in CI, since we start
  // and close Heroic quickly there. Displaying an error box would lock up
  // the test (until the timeout is reached), so let's not do that
  if (process.env.CI === 'e2e') return

  showDialogBoxModalAuto({
    title: i18next.t(
      'box.error.uncaught-exception.title',
      'Uncaught Exception occured!'
    ),
    message: i18next.t('box.error.uncaught-exception.message', {
      defaultValue:
        'A uncaught exception occured:{{newLine}}{{error}}{{newLine}}{{newLine}} Report the exception on our Github repository.',
      newLine: '\n',
      error: err
    }),
    type: 'ERROR'
  })
})

let powerId: number | null
let displaySleepId: number | null

ipcMain.on('lock', (e, playing: boolean) => {
  if (!playing && (!powerId || !powerSaveBlocker.isStarted(powerId))) {
    logInfo('Preventing machine to sleep', LogPrefix.Backend)
    powerId = powerSaveBlocker.start('prevent-app-suspension')
  }

  if (
    playing &&
    (!displaySleepId || !powerSaveBlocker.isStarted(displaySleepId))
  ) {
    logInfo('Preventing display to sleep', LogPrefix.Backend)
    displaySleepId = powerSaveBlocker.start('prevent-display-sleep')
  }
})

ipcMain.on('unlock', () => {
  if (powerId && powerSaveBlocker.isStarted(powerId)) {
    logInfo('Stopping Power Saver Blocker', LogPrefix.Backend)
    powerSaveBlocker.stop(powerId)
  }
  if (displaySleepId && powerSaveBlocker.isStarted(displaySleepId)) {
    logInfo('Stopping Display Sleep Blocker', LogPrefix.Backend)
    powerSaveBlocker.stop(displaySleepId)
  }
})

ipcMain.handle('checkDiskSpace', async (_e, folder): Promise<DiskSpaceData> => {
  // FIXME: Propagate errors
  const parsedPath = Path.parse(folder)

  const { freeSpace, totalSpace } = await getDiskInfo(parsedPath)
  const pathIsWritable = await isWritable(parsedPath)
  const pathIsFlatpakAccessible = isAccessibleWithinFlatpakSandbox(parsedPath)

  return {
    free: freeSpace,
    diskSize: totalSpace,
    validPath: pathIsWritable,
    validFlatpakPath: pathIsFlatpakAccessible,
    message: `${getFileSize(freeSpace)} / ${getFileSize(totalSpace)}`
  }
})

ipcMain.handle('isFrameless', () => isFrameless())
ipcMain.handle('isMinimized', () => !!getMainWindow()?.isMinimized())
ipcMain.handle('isMaximized', () => !!getMainWindow()?.isMaximized())
ipcMain.on('minimizeWindow', () => getMainWindow()?.minimize())
ipcMain.on('maximizeWindow', () => getMainWindow()?.maximize())
ipcMain.on('unmaximizeWindow', () => getMainWindow()?.unmaximize())
ipcMain.on('closeWindow', () => getMainWindow()?.close())
ipcMain.on('quit', async () => handleExit())

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  const mainWindow = getMainWindow()

  if (mainWindow) {
    handleProtocol([url])
  } else {
    openUrlArgument = url
  }
})

ipcMain.on('openExternalUrl', async (event, url) => openUrlOrFile(url))
ipcMain.on('openFolder', async (event, folder) => openUrlOrFile(folder))
ipcMain.on('openSupportPage', async () => openUrlOrFile(supportURL))
ipcMain.on('openReleases', async () => openUrlOrFile(heroicGithubURL))
ipcMain.on('openWeblate', async () => openUrlOrFile(weblateUrl))
ipcMain.on('showAboutWindow', () => showAboutWindow())
ipcMain.on('openLoginPage', async () => openUrlOrFile(epicLoginUrl))
ipcMain.on('openDiscordLink', async () => openUrlOrFile(discordLink))
ipcMain.on('openPatreonPage', async () => openUrlOrFile(patreonPage))
ipcMain.on('openKofiPage', async () => openUrlOrFile(kofiPage))
ipcMain.on('openWinePrefixFAQ', async () => openUrlOrFile(wineprefixFAQ))
ipcMain.on('openWebviewPage', async (event, url) => openUrlOrFile(url))
ipcMain.on('openWikiLink', async () => openUrlOrFile(wikiLink))
ipcMain.on('openSidInfoPage', async () => openUrlOrFile(sidInfoUrl))
ipcMain.on('openCustomThemesWiki', async () =>
  openUrlOrFile(customThemesWikiLink)
)
ipcMain.on('showConfigFileInFolder', async (event, appName) => {
  if (appName === 'default') {
    return openUrlOrFile(configPath)
  }
  return openUrlOrFile(path.join(gamesConfigPath, `${appName}.json`))
})

ipcMain.on('removeFolder', async (e, [path, folderName]) => {
  removeFolder(path, folderName)
})

ipcMain.handle('runWineCommand', async (e, args) => runWineCommand(args))

/// IPC handlers begin here.

ipcMain.handle('checkGameUpdates', async (): Promise<string[]> => {
  let oldGames: string[] = []
  const { autoUpdateGames } = GlobalConfig.get().getSettings()
  for (const runner in libraryManagerMap) {
    let gamesToUpdate = await libraryManagerMap[runner].listUpdateableGames()
    if (autoUpdateGames) {
      gamesToUpdate = autoUpdate(runner as Runner, gamesToUpdate)
    }
    oldGames = [...oldGames, ...gamesToUpdate]
  }

  return oldGames
})

ipcMain.handle('getEpicGamesStatus', async () => isEpicServiceOffline())

ipcMain.handle('getMaxCpus', () => cpus().length)

ipcMain.handle('getHeroicVersion', app.getVersion)
ipcMain.handle('isFullscreen', () => isSteamDeckGameMode || isCLIFullscreen)
ipcMain.handle('isFlatpak', () => isFlatpak)
ipcMain.handle('getGameOverride', async () => getGameOverride())
ipcMain.handle('getGameSdl', async (event, appName) => getGameSdl(appName))

ipcMain.handle('showUpdateSetting', () => !isFlatpak)

ipcMain.handle('getLatestReleases', async () => {
  const { checkForUpdatesOnStartup } = GlobalConfig.get().getSettings()
  if (checkForUpdatesOnStartup) {
    return getLatestReleases()
  } else {
    return []
  }
})

ipcMain.handle('getCurrentChangelog', async () => {
  return getCurrentChangelog()
})

ipcMain.on('clearCache', (event, showDialog, fromVersionChange = false) => {
  clearCache(undefined, fromVersionChange)
  sendFrontendMessage('refreshLibrary')

  if (showDialog) {
    showDialogBoxModalAuto({
      event,
      title: i18next.t('box.cache-cleared.title', 'Cache Cleared'),
      message: i18next.t(
        'box.cache-cleared.message',
        'Heroic Cache Was Cleared!'
      ),
      type: 'MESSAGE',
      buttons: [{ text: i18next.t('box.ok', 'Ok') }]
    })
  }
})

ipcMain.on('resetHeroic', () => resetHeroic())

ipcMain.on('createNewWindow', (e, url) => {
  new BrowserWindow({ height: 700, width: 1200 }).loadURL(url)
})

ipcMain.handle('isGameAvailable', async (e, args) => {
  const { appName, runner } = args
  return gameManagerMap[runner].isGameAvailable(appName)
})

ipcMain.handle('getGameInfo', async (event, appName, runner) => {
  // Fastpath since we sometimes have to request info for a GOG game as Legendary because we don't know it's a GOG game yet
  if (runner === 'legendary' && !LegendaryLibraryManager.hasGame(appName)) {
    return null
  }
  const tempGameInfo = gameManagerMap[runner].getGameInfo(appName)
  // The game managers return an empty object if they couldn't fetch the game
  // info, since most of the backend assumes getting it can never fail (and
  // an empty object is a little easier to work with than `null`)
  // The frontend can however handle being passed an explicit `null` value, so
  // we return that here instead if the game info is empty
  if (!Object.keys(tempGameInfo).length) return null
  return tempGameInfo
})

ipcMain.handle('getExtraInfo', async (event, appName, runner) => {
  // Fastpath since we sometimes have to request info for a GOG game as Legendary because we don't know it's a GOG game yet
  if (runner === 'legendary' && !LegendaryLibraryManager.hasGame(appName)) {
    return null
  }
  return gameManagerMap[runner].getExtraInfo(appName)
})

ipcMain.handle('getGameSettings', async (event, appName, runner) => {
  try {
    return await gameManagerMap[runner].getSettings(appName)
  } catch (error) {
    logError(error, LogPrefix.Backend)
    return null
  }
})

ipcMain.handle('getGOGLinuxInstallersLangs', async (event, appName) =>
  GOGLibraryManager.getLinuxInstallersLanguages(appName)
)

ipcMain.handle(
  'getInstallInfo',
  async (event, appName, runner, installPlatform, build, branch) => {
    try {
      const info = await libraryManagerMap[runner].getInstallInfo(
        appName,
        installPlatform,
        {
          branch,
          build
        }
      )
      if (info === undefined) return null
      return info
    } catch (error) {
      logError(
        error,
        runner === 'legendary' ? LogPrefix.Legendary : LogPrefix.Gog
      )
      return null
    }
  }
)

ipcMain.handle('getUserInfo', async () => {
  return LegendaryUser.getUserInfo()
})

ipcMain.handle('getAmazonUserInfo', async () => NileUser.getUserData())

// Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', LegendaryUser.isLoggedIn)

ipcMain.handle('login', async (event, sid) => LegendaryUser.login(sid))
ipcMain.handle('authGOG', async (event, code) => GOGUser.login(code))
ipcMain.handle('logoutLegendary', LegendaryUser.logout)
ipcMain.on('logoutGOG', GOGUser.logout)
ipcMain.handle('getLocalPeloadPath', async () => {
  return fixAsarPath(join('file://', publicDir, 'webviewPreload.js'))
})

ipcMain.handle('getAmazonLoginData', NileUser.getLoginData)
ipcMain.handle('authAmazon', async (event, data) => NileUser.login(data))
ipcMain.handle('logoutAmazon', NileUser.logout)

ipcMain.handle('getAlternativeWine', async () =>
  GlobalConfig.get().getAlternativeWine()
)

ipcMain.handle('readConfig', async (event, configClass) => {
  if (configClass === 'library') {
    await libraryManagerMap['legendary'].refresh()
    return LegendaryLibraryManager.getListOfGames()
  }
  const userInfo = LegendaryUser.getUserInfo()
  return userInfo?.displayName ?? ''
})

ipcMain.handle('requestSettings', async (event, appName) => {
  // To the changes how we handle env and wrappers
  // otherOptions is deprectaed and needs to be mapped
  // to new approach.
  // Can be removed if otherOptions is removed aswell
  const mapOtherSettings = (config: AppSettings | GameSettings) => {
    if (config.otherOptions) {
      if (config.enviromentOptions.length <= 0) {
        config.otherOptions
          .split(' ')
          .filter((val) => val.indexOf('=') !== -1)
          .forEach((envKeyAndVar) => {
            const keyAndValueSplit = envKeyAndVar.split('=')
            const key = keyAndValueSplit.shift()!
            const value = keyAndValueSplit.join('=')
            config.enviromentOptions.push({ key, value })
          })
      }

      if (config.wrapperOptions.length <= 0) {
        const args: string[] = []
        config.otherOptions
          .split(' ')
          .filter((val) => val.indexOf('=') === -1)
          .forEach((val, index) => {
            if (index === 0) {
              config.wrapperOptions.push({ exe: val, args: '' })
            } else {
              args.push(val)
            }
          })

        if (config.wrapperOptions.at(0)) {
          config.wrapperOptions.at(0)!.args = shlex.join(args)
        }
      }

      delete config.otherOptions
    }
    return config
  }

  if (appName === 'default') {
    return mapOtherSettings(GlobalConfig.get().getSettings())
  }

  const config = await GameConfig.get(appName).getSettings()
  return mapOtherSettings(config)
})

ipcMain.handle('toggleDXVK', async (event, { appName, action }) =>
  GameConfig.get(appName)
    .getSettings()
    .then(async (gameSettings) =>
      DXVK.installRemove(gameSettings, 'dxvk', action)
    )
)

ipcMain.handle('toggleDXVKNVAPI', async (event, { appName, action }) =>
  GameConfig.get(appName)
    .getSettings()
    .then(async (gameSettings) =>
      DXVK.installRemove(gameSettings, 'dxvk-nvapi', action)
    )
)

ipcMain.handle('toggleVKD3D', async (event, { appName, action }) =>
  GameConfig.get(appName)
    .getSettings()
    .then(async (gameSettings) =>
      DXVK.installRemove(gameSettings, 'vkd3d', action)
    )
)

ipcMain.handle('writeConfig', (event, { appName, config }) => {
  logInfo(
    `Writing config for ${appName === 'default' ? 'Heroic' : appName}`,
    LogPrefix.Backend
  )
  const oldConfig =
    appName === 'default'
      ? GlobalConfig.get().getSettings()
      : GameConfig.get(appName).config

  // log only the changed setting
  logChangedSetting(config, oldConfig)

  if (appName === 'default') {
    GlobalConfig.get().set(config as AppSettings)
    GlobalConfig.get().flush()
    const currentConfigStore = configStore.get_nodefault('settings')
    if (currentConfigStore) {
      configStore.set('settings', { ...currentConfigStore, ...config })
    }
  } else {
    GameConfig.get(appName).config = config as GameSettings
    GameConfig.get(appName).flush()
  }
})

ipcMain.on('setSetting', (event, { appName, key, value }) => {
  if (appName === 'default') {
    GlobalConfig.get().setSetting(key, value)
  } else {
    GameConfig.get(appName).setSetting(key, value)
  }
})

// Watch the installed games file and trigger a refresh on the installed games if something changes
if (existsSync(installed)) {
  let watchTimeout: NodeJS.Timeout | undefined
  watch(installed, () => {
    logInfo('installed.json updated, refreshing library', LogPrefix.Legendary)
    // `watch` might fire twice (while Legendary/we are still writing chunks of the file), which would in turn make LegendaryLibrary fail to
    // decode the JSON data. So instead of immediately calling LegendaryLibrary.get().refreshInstalled(), call it only after no writes happen
    // in a 500ms timespan
    if (watchTimeout) clearTimeout(watchTimeout)
    watchTimeout = setTimeout(LegendaryLibraryManager.refreshInstalled, 500)
  })
}

ipcMain.handle('refreshLibrary', async (e, library?) => {
  if (library !== undefined && library !== 'all') {
    await libraryManagerMap[library].refresh()
  } else {
    const allRefreshPromises = []
    for (const runner_i in libraryManagerMap) {
      allRefreshPromises.push(libraryManagerMap[runner_i].refresh())
    }
    await Promise.allSettled(allRefreshPromises)
  }
})

ipcMain.on('logError', (e, err) => logError(err, LogPrefix.Frontend))

ipcMain.on('logInfo', (e, info) => logInfo(info, LogPrefix.Frontend))

let powerDisplayId: number | null

// get pid/tid on launch and inject
ipcMain.handle(
  'launch',
  async (
    event,
    { appName, launchArguments, runner, skipVersionCheck }
  ): StatusPromise => {
    const game = gameManagerMap[runner].getGameInfo(appName)
    const gameSettings = await gameManagerMap[runner].getSettings(appName)
    const { autoSyncSaves, savesPath, gogSaves = [] } = gameSettings

    const { title } = game

    const { minimizeOnLaunch } = GlobalConfig.get().getSettings()

    const startPlayingDate = new Date()

    if (!tsStore.has(game.app_name)) {
      tsStore.set(
        `${game.app_name}.firstPlayed`,
        startPlayingDate.toISOString()
      )
    }

    logInfo(`Launching ${title} (${game.app_name})`, LogPrefix.Backend)

    if (autoSyncSaves && isOnline()) {
      sendGameStatusUpdate({
        appName,
        runner,
        status: 'syncing-saves'
      })
      logInfo(`Downloading saves for ${title}`, LogPrefix.Backend)
      try {
        await gameManagerMap[runner].syncSaves(
          appName,
          '--skip-upload',
          savesPath,
          gogSaves
        )
        logInfo(`Saves for ${title} downloaded`, LogPrefix.Backend)
      } catch (error) {
        logError(
          `Error while downloading saves for ${title}. ${error}`,
          LogPrefix.Backend
        )
      }
    }

    sendGameStatusUpdate({
      appName,
      runner,
      status: 'launching'
    })

    const mainWindow = getMainWindow()
    if (minimizeOnLaunch) {
      mainWindow?.hide()
    }

    // Prevent display from sleep
    if (!powerDisplayId) {
      logInfo('Preventing display from sleep', LogPrefix.Backend)
      powerDisplayId = powerSaveBlocker.start('prevent-display-sleep')
    }

    initGamePlayLog(game)

    if (logsDisabled) {
      appendGamePlayLog(
        game,
        'IMPORTANT: Logs are disabled. Enable logs before reporting an issue.'
      )
    }

    const isNative = gameManagerMap[runner].isNative(appName)

    // check if isNative, if not, check if wine is valid
    if (!isNative) {
      const isWineOkToLaunch = await checkWineBeforeLaunch(game, gameSettings)

      if (!isWineOkToLaunch) {
        logError(
          `Was not possible to launch using ${gameSettings.wineVersion.name}`,
          LogPrefix.Backend
        )

        sendGameStatusUpdate({
          appName,
          runner,
          status: 'done'
        })

        stopLogger(appName)

        return { status: 'error' }
      }
    }

    await runBeforeLaunchScript(game, gameSettings)

    sendGameStatusUpdate({
      appName,
      runner,
      status: 'launching'
    })

    const command = gameManagerMap[runner].launch(
      appName,
      launchArguments,
      skipVersionCheck
    )

    if (runner === 'gog') {
      gogPresence.setCurrentGame(appName)
      await gogPresence.setPresence()
    }

    const launchResult = await command
      .catch((exception) => {
        logError(exception, LogPrefix.Backend)
        appendGamePlayLog(
          game,
          `An exception occurred when launching the game:\n${exception.stack}`
        )

        return false
      })
      .finally(async () => {
        await runAfterLaunchScript(game, gameSettings)
        stopLogger(appName)
      })

    if (runner === 'gog') {
      gogPresence.setCurrentGame('')
      await gogPresence.setPresence()
    }
    // Stop display sleep blocker
    if (powerDisplayId !== null) {
      logInfo('Stopping Display Power Saver Blocker', LogPrefix.Backend)
      powerSaveBlocker.stop(powerDisplayId)
    }

    // Update playtime and last played date
    const finishedPlayingDate = new Date()
    tsStore.set(`${appName}.lastPlayed`, finishedPlayingDate.toISOString())
    // Playtime of this session in minutes
    const sessionPlaytime =
      (finishedPlayingDate.getTime() - startPlayingDate.getTime()) / 1000 / 60
    const totalPlaytime =
      sessionPlaytime + tsStore.get(`${appName}.totalPlayed`, 0)
    tsStore.set(`${appName}.totalPlayed`, Math.floor(totalPlaytime))

    const { disablePlaytimeSync } = GlobalConfig.get().getSettings()
    if (runner === 'gog') {
      if (!disablePlaytimeSync) {
        await updateGOGPlaytime(appName, startPlayingDate, finishedPlayingDate)
      } else {
        logWarning(
          'Posting playtime session to server skipped - playtime sync disabled',
          { prefix: LogPrefix.Backend }
        )
      }
    }
    await addRecentGame(game)

    if (autoSyncSaves && isOnline()) {
      sendGameStatusUpdate({
        appName,
        runner,
        status: 'done'
      })

      sendGameStatusUpdate({
        appName,
        runner,
        status: 'syncing-saves'
      })

      logInfo(`Uploading saves for ${title}`, LogPrefix.Backend)
      try {
        await gameManagerMap[runner].syncSaves(
          appName,
          '--skip-download',
          savesPath,
          gogSaves
        )
        logInfo(`Saves uploaded for ${title}`, LogPrefix.Backend)
      } catch (error) {
        logError(
          `Error uploading saves for ${title}. Error: ${error}`,
          LogPrefix.Backend
        )
      }
    }

    sendGameStatusUpdate({
      appName,
      runner,
      status: 'done'
    })

    // Exit if we've been launched without UI
    if (isCLINoGui) {
      app.exit()
    }

    return { status: launchResult ? 'done' : 'error' }
  }
)

ipcMain.handle('openDialog', async (e, args) => {
  const mainWindow = getMainWindow()
  if (!mainWindow) {
    return false
  }

  const { filePaths, canceled } = await showOpenDialog(mainWindow, args)
  if (!canceled) {
    return filePaths[0]
  }
  return false
})

ipcMain.on('showItemInFolder', async (e, item) => showItemInFolder(item))

ipcMain.handle('uninstall', uninstallGameCallback)

ipcMain.handle('repair', async (event, appName, runner) => {
  if (!isOnline()) {
    logWarning(
      `App offline, skipping repair for game '${appName}'.`,
      LogPrefix.Backend
    )
    return
  }

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'repairing'
  })

  const { title } = gameManagerMap[runner].getGameInfo(appName)

  try {
    await gameManagerMap[runner].repair(appName)
  } catch (error) {
    notify({
      title,
      body: i18next.t('notify.error.reparing', 'Error Repairing')
    })
    logError(error, LogPrefix.Backend)
  }
  notify({ title, body: i18next.t('notify.finished.reparing') })
  logInfo('Finished repairing', LogPrefix.Backend)

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'done'
  })
})

ipcMain.handle(
  'moveInstall',
  async (event, { appName, path, runner }): Promise<void> => {
    sendGameStatusUpdate({
      appName,
      runner,
      status: 'moving'
    })

    const { title } = gameManagerMap[runner].getGameInfo(appName)
    notify({ title, body: i18next.t('notify.moving', 'Moving Game') })

    const moveRes = await gameManagerMap[runner].moveInstall(appName, path)
    if (moveRes.status === 'error') {
      notify({
        title,
        body: i18next.t('notify.error.move', 'Error Moving Game')
      })
      logError(
        `Error while moving ${appName} to ${path}: ${moveRes.error} `,
        LogPrefix.Backend
      )

      showDialogBoxModalAuto({
        event,
        title: i18next.t('box.error.title', 'Error'),
        message: i18next.t('box.error.moving', 'Error Moving Game {{error}}', {
          error: moveRes.error
        }),
        type: 'ERROR'
      })
    }

    if (moveRes.status === 'done') {
      notify({ title, body: i18next.t('notify.moved') })
      logInfo(`Finished moving ${appName} to ${path}.`, LogPrefix.Backend)
    }

    sendGameStatusUpdate({
      appName,
      runner,
      status: 'done'
    })
  }
)

ipcMain.handle(
  'importGame',
  async (event, { appName, path, runner, platform }): StatusPromise => {
    const epicOffline = await isEpicServiceOffline()
    if (epicOffline && runner === 'legendary') {
      showDialogBoxModalAuto({
        event,
        title: i18next.t('box.warning.title', 'Warning'),
        message: i18next.t(
          'box.warning.epic.import',
          'Epic Servers are having major outage right now, the game cannot be imported!'
        ),
        type: 'ERROR'
      })
      return { status: 'error' }
    }

    const title = gameManagerMap[runner].getGameInfo(appName).title
    sendGameStatusUpdate({
      appName,
      runner,
      status: 'installing'
    })

    const abortMessage = () => {
      notify({ title, body: i18next.t('notify.install.canceled') })
      sendGameStatusUpdate({
        appName,
        runner,
        status: 'done'
      })
    }

    try {
      const { abort, error } = await gameManagerMap[runner].importGame(
        appName,
        path,
        platform
      )
      if (abort || error) {
        abortMessage()
        return { status: 'done' }
      }
    } catch (error) {
      abortMessage()
      logError(error, LogPrefix.Backend)
      return { status: 'error' }
    }

    notify({
      title,
      body: i18next.t('notify.install.imported', 'Game Imported')
    })
    sendGameStatusUpdate({
      appName,
      runner,
      status: 'done'
    })
    logInfo(`imported ${title}`, LogPrefix.Backend)
    return { status: 'done' }
  }
)

ipcMain.handle('kill', async (event, appName, runner) => {
  callAbortController(appName)
  return gameManagerMap[runner].stop(appName)
})

ipcMain.handle('updateGame', async (event, appName, runner): StatusPromise => {
  if (!isOnline()) {
    logWarning(
      `App offline, skipping install for game '${appName}'.`,
      LogPrefix.Backend
    )
    return { status: 'error' }
  }

  const epicOffline = await isEpicServiceOffline()
  if (epicOffline && runner === 'legendary') {
    showDialogBoxModalAuto({
      event,
      title: i18next.t('box.warning.title', 'Warning'),
      message: i18next.t(
        'box.warning.epic.update',
        'Epic Servers are having major outage right now, the game cannot be updated!'
      ),
      type: 'ERROR'
    })
    return { status: 'error' }
  }

  const { title } = gameManagerMap[runner].getGameInfo(appName)
  notify({
    title,
    body: i18next.t('notify.update.started', 'Update Started')
  })

  let status: 'done' | 'error' | 'abort' = 'error'
  try {
    status = (await gameManagerMap[runner].update(appName)).status
  } catch (error) {
    logError(error, LogPrefix.Backend)
    notify({ title, body: i18next.t('notify.update.canceled') })
    return { status: 'error' }
  }
  notify({
    title,
    body:
      status === 'done'
        ? i18next.t('notify.update.finished')
        : i18next.t('notify.update.canceled')
  })
  logInfo('finished updating', LogPrefix.Backend)
  return { status }
})

ipcMain.handle(
  'changeInstallPath',
  async (event, { appName, path, runner }) => {
    await libraryManagerMap[runner].changeGameInstallPath(appName, path)
    logInfo(
      `Finished changing install path of ${appName} to ${path}.`,
      LogPrefix.Backend
    )
  }
)

ipcMain.handle('egsSync', async (event, args) => {
  return LegendaryLibraryManager.toggleGamesSync(args)
})

ipcMain.handle('syncGOGSaves', async (event, gogSaves, appName, arg) =>
  gameManagerMap['gog'].syncSaves(appName, arg, '', gogSaves)
)

ipcMain.handle('getLaunchOptions', async (event, appName, runner) =>
  libraryManagerMap[runner].getLaunchOptions(appName)
)

ipcMain.handle(
  'syncSaves',
  async (event, { arg = '', path, appName, runner }) => {
    if (runner === 'legendary') {
      const epicOffline = await isEpicServiceOffline()
      if (epicOffline) {
        logWarning(
          'Epic is offline right now, cannot sync saves!',
          LogPrefix.Backend
        )
        return 'Epic is offline right now, cannot sync saves!'
      }
    }
    if (!isOnline()) {
      logWarning('App is offline, cannot sync saves!', LogPrefix.Backend)
      return 'App is offline, cannot sync saves!'
    }

    const output = await gameManagerMap[runner].syncSaves(appName, arg, path)
    logInfo(output, LogPrefix.Backend)
    return output
  }
)

ipcMain.handle(
  'getDefaultSavePath',
  async (event, appName, runner, alreadyDefinedGogSaves) =>
    getDefaultSavePath(appName, runner, alreadyDefinedGogSaves)
)

// Simulate keyboard and mouse actions as if the real input device is used
ipcMain.handle('gamepadAction', async (event, args) => {
  // we can only receive gamepad events if the main window exists
  const mainWindow = getMainWindow()!

  const { action, metadata } = args
  const inputEvents: GamepadInputEvent[] = []

  /*
   * How to extend:
   *
   * Valid values for type are 'keyDown', 'keyUp' and 'char'
   * Valid values for keyCode are defined here:
   * https://www.electronjs.org/docs/latest/api/accelerator#available-key-codes
   *
   */
  switch (action) {
    case 'rightStickUp':
      inputEvents.push({
        type: 'mouseWheel',
        deltaY: 50,
        x: mainWindow.getBounds().width / 2,
        y: mainWindow.getBounds().height / 2
      })
      break
    case 'rightStickDown':
      inputEvents.push({
        type: 'mouseWheel',
        deltaY: -50,
        x: mainWindow.getBounds().width / 2,
        y: mainWindow.getBounds().height / 2
      })
      break
    case 'leftStickUp':
    case 'leftStickDown':
    case 'leftStickLeft':
    case 'leftStickRight':
    case 'padUp':
    case 'padDown':
    case 'padLeft':
    case 'padRight':
      // spatial navigation
      inputEvents.push({
        type: 'keyDown',
        keyCode: action.replace(/pad|leftStick/, '')
      })
      inputEvents.push({
        type: 'keyUp',
        keyCode: action.replace(/pad|leftStick/, '')
      })
      break
    case 'leftClick':
      inputEvents.push({
        type: 'mouseDown',
        button: 'left',
        x: metadata.x,
        y: metadata.y
      })
      inputEvents.push({
        type: 'mouseUp',
        button: 'left',
        x: metadata.x,
        y: metadata.y
      })
      break
    case 'rightClick':
      inputEvents.push({
        type: 'mouseDown',
        button: 'right',
        x: metadata.x,
        y: metadata.y
      })
      inputEvents.push({
        type: 'mouseUp',
        button: 'right',
        x: metadata.x,
        y: metadata.y
      })
      break
    case 'back':
      mainWindow.webContents.goBack()
      break
    case 'esc':
      inputEvents.push({
        type: 'keyDown',
        keyCode: 'Esc'
      })
      inputEvents.push({
        type: 'keyUp',
        keyCode: 'Esc'
      })
      break
  }

  if (inputEvents.length) {
    inputEvents.forEach((event) => mainWindow.webContents.sendInputEvent(event))
  }
})

ipcMain.handle('getFonts', async (event, reload) => {
  let cachedFonts = fontsStore.get('fonts', [])
  if (cachedFonts.length === 0 || reload) {
    cachedFonts = await getFonts()
    cachedFonts = cachedFonts.sort((a, b) => a.localeCompare(b))
    fontsStore.set('fonts', cachedFonts)
  }
  return cachedFonts
})

ipcMain.handle('getShellPath', async (event, path) => getShellPath(path))

ipcMain.handle('clipboardReadText', () => clipboard.readText())

ipcMain.on('clipboardWriteText', (e, text) => clipboard.writeText(text))

ipcMain.handle('getCustomThemes', async () => {
  const { customThemesPath } = GlobalConfig.get().getSettings()

  if (!existsSync(customThemesPath)) {
    return []
  }

  return readdirSync(customThemesPath).filter((fileName) =>
    fileName.endsWith('.css')
  )
})

ipcMain.handle('getThemeCSS', async (event, theme) => {
  const { customThemesPath = '' } = GlobalConfig.get().getSettings()

  const cssPath = path.join(customThemesPath, theme)

  if (!existsSync(cssPath)) {
    return ''
  }

  return readFileSync(cssPath, 'utf-8')
})

ipcMain.on('setTitleBarOverlay', (e, args) => {
  const mainWindow = getMainWindow()
  if (typeof mainWindow?.['setTitleBarOverlay'] === 'function') {
    logDebug(`Setting titlebar overlay options ${JSON.stringify(args)}`)
    mainWindow?.setTitleBarOverlay(args)
  }
})

ipcMain.on('addNewApp', (e, args) => addNewApp(args))

ipcMain.handle('removeApp', async (e, args) => {
  gameManagerMap[args.runner].uninstall(args)
})

ipcMain.handle('isNative', (e, { appName, runner }) => {
  return gameManagerMap[runner].isNative(appName)
})

ipcMain.handle('pathExists', async (e, path: string) => {
  return existsSync(path)
})

ipcMain.on('processShortcut', async (e, combination: string) => {
  const mainWindow = getMainWindow()

  switch (combination) {
    // hotkey to reload the app
    case 'ctrl+r':
      mainWindow?.reload()
      break
    // hotkey to quit the app
    case 'ctrl+q':
      handleExit()
      break
    // hotkey to open the settings on frontend
    case 'ctrl+k':
      sendFrontendMessage('openScreen', '/settings/app/default/general')
      break
    // hotkey to open the downloads screen on frontend
    case 'ctrl+j':
      sendFrontendMessage('openScreen', '/download-manager')
      break
    // hotkey to open the library screen on frontend
    case 'ctrl+l':
      sendFrontendMessage('openScreen', '/library')
      break
    case 'ctrl+shift+i':
      mainWindow?.webContents?.openDevTools()
      break
  }
})

ipcMain.handle(
  'getPlaytimeFromRunner',
  async (e, runner, appName): Promise<number | undefined> => {
    const { disablePlaytimeSync } = GlobalConfig.get().getSettings()
    if (disablePlaytimeSync) {
      return
    }
    if (runner === 'gog') {
      return getGOGPlaytime(appName)
    }

    return
  }
)

ipcMain.handle('getPrivateBranchPassword', (e, appName) =>
  getBranchPassword(appName)
)
ipcMain.handle('setPrivateBranchPassword', (e, appName, password) =>
  setBranchPassword(appName, password)
)

ipcMain.handle('getAvailableCyberpunkMods', async () => getCyberpunkMods())
ipcMain.handle('setCyberpunkModConfig', async (e, props) =>
  GOGLibraryManager.setCyberpunkModConfig(props)
)

ipcMain.on('changeGameVersionPinnedStatus', (e, appName, runner, status) => {
  libraryManagerMap[runner].changeVersionPinnedStatus(appName, status)
})

/*
  Other Keys that should go into translation files:
  t('box.error.generic.title')
  t('box.error.generic.message')
 */

/*
 * INSERT OTHER IPC HANDLERS HERE
 */
import './logger/ipc_handler'
import './wine/manager/ipc_handler'
import './shortcuts/ipc_handler'
import './anticheat/ipc_handler'
import './storeManagers/legendary/eos_overlay/ipc_handler'
import './wine/runtimes/ipc_handler'
import './downloadmanager/ipc_handler'
import './utils/ipc_handler'
import './wiki_game_info/ipc_handler'
import './recent_games/ipc_handler'
import './tools/ipc_handler'
import './progress_bar'
import {
  getDiskInfo,
  isAccessibleWithinFlatpakSandbox,
  isWritable
} from './utils/filesystem'
import { Path } from './schemas'
