import { initImagesCache } from './images_cache'
import { downloadAntiCheatData } from './anticheat/utils'
import {
  AppSettings,
  GameSettings,
  DiskSpaceData,
  StatusPromise,
  GamepadInputEvent
} from 'common/types'
import * as path from 'path'
import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  dialog,
  ipcMain,
  powerSaveBlocker,
  protocol,
  screen,
  clipboard,
  nativeImage
} from 'electron'
import 'backend/updater'
import { autoUpdater } from 'electron-updater'
import { cpus, platform } from 'os'
import {
  access,
  appendFileSync,
  constants,
  existsSync,
  mkdirSync,
  rmSync,
  unlinkSync,
  watch,
  writeFileSync,
  readdirSync,
  readFileSync
} from 'graceful-fs'

import Backend from 'i18next-fs-backend'
import i18next from 'i18next'
import { join } from 'path'
import checkDiskSpace from 'check-disk-space'
import { DXVK, Winetricks } from './tools'
import { GameConfig } from './game_config'
import { GlobalConfig } from './config'
import { LegendaryLibrary } from './legendary/library'
import { LegendaryUser } from './legendary/user'
import { GOGUser } from './gog/user'
import { GOGLibrary } from './gog/library'
import setup from './gog/setup'
import {
  clearCache,
  execAsync,
  isEpicServiceOffline,
  getLegendaryVersion,
  getGogdlVersion,
  getSystemInfo,
  handleExit,
  openUrlOrFile,
  resetHeroic,
  showAboutWindow,
  showItemInFolder,
  getLegendaryBin,
  getGOGdlBin,
  getFileSize,
  detectVCRedist,
  getGame,
  getFirstExistingParentPath,
  getLatestReleases,
  notify,
  getShellPath,
  getCurrentChangelog
} from './utils'
import {
  configStore,
  discordLink,
  heroicGamesConfigPath,
  heroicGithubURL,
  userHome,
  icon,
  iconDark,
  iconLight,
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
  heroicConfigPath,
  isMac,
  isSteamDeckGameMode,
  isCLIFullscreen,
  isCLINoGui,
  isFlatpak,
  publicDir,
  wineprefixFAQ,
  customThemesWikiLink
} from './constants'
import { handleProtocol } from './protocol'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from './logger/logger'
import { gameInfoStore } from './legendary/electronStores'
import { getFonts } from 'font-list'
import { runWineCommand, verifyWinePrefix } from './launcher'
import shlex from 'shlex'
import { initQueue } from './downloadmanager/downloadqueue'
import {
  initOnlineMonitor,
  isOnline,
  runOnceWhenOnline
} from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { addRecentGame, getRecentGames } from './recent_games'
import {
  addNewApp,
  appLogFileLocation,
  getAppInfo,
  getAppSettings,
  isAppAvailable,
  isNativeApp,
  launchApp,
  removeApp,
  stop
} from './sideload/games'
import { callAbortController } from './utils/aborthandler/aborthandler'
import { getDefaultSavePath } from './save_sync'
import si from 'systeminformation'

const { showOpenDialog } = dialog
const isWindows = platform() === 'win32'

let mainWindow: BrowserWindow

async function createWindow(): Promise<BrowserWindow> {
  configStore.set('userHome', userHome)

  let windowProps: Electron.Rectangle = {
    height: 690,
    width: 1200,
    x: 0,
    y: 0
  }

  if (configStore.has('window-props')) {
    const tmpWindowProps = configStore.get(
      'window-props',
      {}
    ) as Electron.Rectangle
    if (
      tmpWindowProps &&
      tmpWindowProps.width &&
      tmpWindowProps.height &&
      tmpWindowProps.y !== undefined &&
      tmpWindowProps.x !== undefined
    ) {
      windowProps = tmpWindowProps
    }
  } else {
    // make sure initial screen size is not bigger than the available screen space
    const screenInfo = screen.getPrimaryDisplay()

    if (screenInfo.workAreaSize.height > windowProps.height) {
      windowProps.height = screenInfo.workAreaSize.height * 0.8
    }

    if (screenInfo.workAreaSize.width > windowProps.width) {
      windowProps.width = screenInfo.workAreaSize.width * 0.8
    }
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    ...windowProps,
    minHeight: 345,
    minWidth: 600,
    show: false,

    webPreferences: {
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: true,
      // sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if ((isSteamDeckGameMode || isCLIFullscreen) && !isCLINoGui) {
    logInfo(
      [
        isSteamDeckGameMode
          ? 'Heroic started via Steam-Deck gamemode.'
          : 'Heroic started with --fullscreen',
        'Switching to fullscreen'
      ],
      { prefix: LogPrefix.Backend }
    )
    mainWindow.setFullScreen(true)
  }

  setTimeout(() => {
    DXVK.getLatest()
    Winetricks.download()
  }, 2500)

  GlobalConfig.get()
  LegendaryLibrary.get()
  GOGLibrary.get()

  mainWindow.setIcon(icon)
  app.setAppUserModelId('Heroic')
  app.commandLine.appendSwitch('enable-spatial-navigation')

  mainWindow.on('close', async (e) => {
    e.preventDefault()

    if (!isCLIFullscreen && !isSteamDeckGameMode) {
      // store windows properties
      configStore.set('window-props', mainWindow.getBounds())
    }

    const { exitToTray } = GlobalConfig.get().config

    if (exitToTray) {
      logInfo('Exitting to tray instead of quitting', {
        prefix: LogPrefix.Backend
      })
      return mainWindow.hide()
    }

    handleExit(mainWindow)
  })

  if (isWindows) {
    detectVCRedist(mainWindow)
  }

  if (!app.isPackaged) {
    if (!process.env.HEROIC_NO_REACT_DEVTOOLS) {
      import('electron-devtools-installer').then((devtools) => {
        const { default: installExtension, REACT_DEVELOPER_TOOLS } = devtools

        installExtension(REACT_DEVELOPER_TOOLS).catch((err: string) => {
          logWarning(['An error occurred: ', err], {
            prefix: LogPrefix.Backend
          })
        })
      })
    }
    mainWindow.loadURL('http://localhost:5173')
    // Open the DevTools.
    mainWindow.webContents.openDevTools()
  } else {
    Menu.setApplicationMenu(null)
    mainWindow.loadURL(`file://${path.join(publicDir, '../build/index.html')}`)
    if (!isMac) {
      autoUpdater.checkForUpdates()
    }
  }
  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
const gotTheLock = app.requestSingleInstanceLock()
let openUrlArgument = ''

const contextMenu = async () => {
  const recentsMenu = (await getRecentGames({ limited: true })).map((game) => {
    return {
      click: function () {
        handleProtocol(mainWindow, [`heroic://launch/${game.appName}`])
      },
      label: game.title
    }
  })

  return Menu.buildFromTemplate([
    ...recentsMenu,
    { type: 'separator' },
    {
      click: function () {
        mainWindow.show()
      },
      label: i18next.t('tray.show')
    },
    {
      click: function () {
        showAboutWindow()
      },
      label: i18next.t('tray.about', 'About')
    },
    {
      accelerator: process.platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R',
      click: function () {
        mainWindow.reload()
      },
      label: i18next.t('tray.reload', 'Reload')
    },
    {
      label: 'Debug',
      accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
      click: () => {
        mainWindow.webContents.openDevTools()
      }
    },
    {
      click: function () {
        handleExit(mainWindow)
      },
      label: i18next.t('tray.quit', 'Quit'),
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q'
    }
  ])
}

const processZoomForScreen = (zoomFactor: number) => {
  const screenSize = screen.getPrimaryDisplay().workAreaSize.width
  if (screenSize < 1200) {
    const extraDPIZoomIn = screenSize / 1200
    return zoomFactor * extraDPIZoomIn
  } else {
    return zoomFactor
  }
}

ipcMain.on('setZoomFactor', async (event, zoomFactor) => {
  const window = BrowserWindow.getAllWindows()[0]
  window.webContents.setZoomFactor(processZoomForScreen(parseFloat(zoomFactor)))
})

if (!gotTheLock) {
  logInfo('Heroic is already running, quitting this instance')
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      mainWindow.show()
    }

    handleProtocol(mainWindow, argv)
  })
  app.whenReady().then(async () => {
    initOnlineMonitor()

    getSystemInfo().then((systemInfo) =>
      logInfo(`\n\n${systemInfo}\n`, { prefix: LogPrefix.Backend })
    )

    initImagesCache()

    logInfo(
      ['Legendary location:', join(...Object.values(getLegendaryBin()))],
      { prefix: LogPrefix.Legendary }
    )
    logInfo(['GOGDL location:', join(...Object.values(getGOGdlBin()))], {
      prefix: LogPrefix.Gog
    })
    // We can't use .config since apparently its not loaded fast enough.
    // TODO: Remove this after a couple of stable releases
    // Affects only current users, not new installs
    const settings = await GlobalConfig.get().getSettings()
    const { language, darkTrayIcon } = settings
    const currentConfigStore = configStore.get('settings', {}) as AppSettings
    if (!currentConfigStore.defaultInstallPath) {
      configStore.set('settings', settings)
    }

    runOnceWhenOnline(async () => {
      const isLoggedIn = LegendaryUser.isLoggedIn()

      if (!isLoggedIn) {
        logInfo('User Not Found, removing it from Store', {
          prefix: LogPrefix.Backend
        })
        configStore.delete('userinfo')
      }

      // Update user details
      if (GOGUser.isLoggedIn()) {
        GOGUser.getUserDetails()
      }
    })

    await i18next.use(Backend).init({
      backend: {
        addPath: path.join(publicDir, 'locales', '{{lng}}', '{{ns}}'),
        allowMultiLoading: false,
        loadPath: path.join(publicDir, 'locales', '{{lng}}', '{{ns}}.json')
      },
      debug: false,
      fallbackLng: 'en',
      lng: language,
      supportedLngs: [
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

    await createWindow()

    protocol.registerStringProtocol('heroic', (request, callback) => {
      handleProtocol(mainWindow, [request.url])
      callback('Operation initiated.')
    })
    if (!app.isDefaultProtocolClient('heroic')) {
      if (app.setAsDefaultProtocolClient('heroic')) {
        logInfo('Registered protocol with OS.', { prefix: LogPrefix.Backend })
      } else {
        logWarning('Failed to register protocol with OS.', {
          prefix: LogPrefix.Backend
        })
      }
    } else {
      logWarning('Protocol already registered.', { prefix: LogPrefix.Backend })
    }

    const { startInTray } = await GlobalConfig.get().getSettings()
    const headless = isCLINoGui || startInTray
    if (!headless) {
      mainWindow.show()
    }

    // set initial zoom level after a moment, if set in sync the value stays as 1
    setTimeout(() => {
      const zoomFactor =
        parseFloat(configStore.get('zoomPercent', '100') as string) / 100

      mainWindow.webContents.setZoomFactor(processZoomForScreen(zoomFactor))
    }, 200)

    const iconSizesByPlatform = {
      darwin: {
        width: 20,
        height: 20
      },
      linux: {
        width: 32,
        height: 32
      },
      win32: {
        width: 32,
        height: 32
      }
    }

    const trayIcon = nativeImage
      .createFromPath(darkTrayIcon ? iconDark : iconLight)
      .resize(iconSizesByPlatform[process.platform])

    const appIcon = new Tray(trayIcon)

    appIcon.on('double-click', () => {
      mainWindow.show()
    })

    appIcon.setContextMenu(await contextMenu())
    appIcon.setToolTip('Heroic')
    ipcMain.on('changeLanguage', async (event, language) => {
      logInfo(['Changing Language to:', language], {
        prefix: LogPrefix.Backend
      })
      await i18next.changeLanguage(language)
      gameInfoStore.clear()
      appIcon.setContextMenu(await contextMenu())
    })

    ipcMain.addListener('changeTrayColor', () => {
      logInfo('Changing Tray icon Color...', { prefix: LogPrefix.Backend })
      setTimeout(async () => {
        const { darkTrayIcon } = await GlobalConfig.get().getSettings()
        const trayIcon = nativeImage
          .createFromPath(darkTrayIcon ? iconDark : iconLight)
          .resize(iconSizesByPlatform[process.platform])
        appIcon.setImage(trayIcon)
        appIcon.setContextMenu(await contextMenu())
      }, 500)
    })

    downloadAntiCheatData()

    return
  })
}

ipcMain.on('notify', (event, args) => notify(args))

ipcMain.on('frontendReady', () => {
  handleProtocol(mainWindow, [openUrlArgument, ...process.argv])
  initQueue()
})

// Maybe this can help with white screens
process.on('uncaughtException', async (err) => {
  logError(`${err.name}: ${err.message}`, { prefix: LogPrefix.Backend })
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

ipcMain.on('lock', () => {
  if (!existsSync(join(heroicGamesConfigPath, 'lock'))) {
    writeFileSync(join(heroicGamesConfigPath, 'lock'), '')
    if (!powerId) {
      logInfo('Preventing machine to sleep', { prefix: LogPrefix.Backend })
      powerId = powerSaveBlocker.start('prevent-app-suspension')
    }
  }
})

ipcMain.on('unlock', () => {
  if (existsSync(join(heroicGamesConfigPath, 'lock'))) {
    unlinkSync(join(heroicGamesConfigPath, 'lock'))
    if (powerId) {
      logInfo('Stopping Power Saver Blocker', { prefix: LogPrefix.Backend })
      return powerSaveBlocker.stop(powerId)
    }
  }
})

ipcMain.handle('checkDiskSpace', async (event, folder) => {
  const parent = getFirstExistingParentPath(folder)
  return new Promise<DiskSpaceData>((res) => {
    access(parent, constants.W_OK, async (writeError) => {
      const { free, size: diskSize } = await checkDiskSpace(folder).catch(
        (checkSpaceError) => {
          logError(
            [
              'Failed to check disk space for',
              `"${folder}":`,
              checkSpaceError.stack ?? `${checkSpaceError}`
            ],
            { prefix: LogPrefix.Backend }
          )
          return { free: 0, size: 0 }
        }
      )
      if (writeError) {
        logWarning(
          [
            'Cannot write to',
            `"${folder}":`,
            writeError.stack ?? `${writeError}`
          ],
          { prefix: LogPrefix.Backend }
        )
      }

      const ret = {
        free,
        diskSize,
        message: `${getFileSize(free)} / ${getFileSize(diskSize)}`,
        validPath: !writeError
      }
      logDebug(`${JSON.stringify(ret)}`, { prefix: LogPrefix.Backend })
      res(ret)
    })
  })
})

ipcMain.on('quit', async () => handleExit(mainWindow))

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  if (mainWindow) {
    handleProtocol(mainWindow, [url])
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
    return openUrlOrFile(heroicConfigPath)
  }
  return openUrlOrFile(path.join(heroicGamesConfigPath, `${appName}.json`))
})

ipcMain.on('removeFolder', async (e, [path, folderName]) => {
  if (path === 'default') {
    const { defaultInstallPath } = await GlobalConfig.get().getSettings()
    const path = defaultInstallPath.replaceAll("'", '')
    const folderToDelete = `${path}/${folderName}`
    if (existsSync(folderToDelete)) {
      return setTimeout(() => {
        rmSync(folderToDelete, { recursive: true })
      }, 5000)
    }
    return
  }

  const folderToDelete = `${path}/${folderName}`.replaceAll("'", '')
  if (existsSync(folderToDelete)) {
    return setTimeout(() => {
      rmSync(folderToDelete, { recursive: true })
    }, 2000)
  }
  return
})

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
ipcMain.handle('callTool', async (event, { tool, exe, appName, runner }) => {
  const game = getGame(appName, runner)
  const isSideloaded = runner === 'sideload'
  const gameSettings = isSideloaded
    ? await getAppSettings(appName)
    : await game.getSettings()
  const { wineVersion, winePrefix } = gameSettings
  await verifyWinePrefix(gameSettings)

  switch (tool) {
    case 'winetricks':
      await verifyWinePrefix(gameSettings)
      await Winetricks.run(wineVersion, winePrefix, event)
      break
    case 'winecfg':
      isSideloaded
        ? runWineCommand({
            gameSettings,
            commandParts: ['winecfg'],
            wait: false
          })
        : game.runWineCommand(['winecfg'])
      break
    case 'runExe':
      if (exe) {
        isSideloaded
          ? runWineCommand({ gameSettings, commandParts: [exe], wait: false })
          : game.runWineCommand([exe])
      }
      break
  }
})

ipcMain.handle('runWineCommand', async (e, args) => runWineCommand(args))

/// IPC handlers begin here.

ipcMain.handle('checkGameUpdates', async (): Promise<string[]> => {
  return [
    ...(await LegendaryLibrary.get().listUpdateableGames()),
    ...(await GOGLibrary.get().listUpdateableGames())
  ]
})

ipcMain.handle('getEpicGamesStatus', async () => isEpicServiceOffline())

// Not ready to be used safely yet.
ipcMain.handle('updateAll', async () => LegendaryLibrary.get().updateAllGames())

ipcMain.handle('getMaxCpus', () => cpus().length)

ipcMain.handle('getHeroicVersion', app.getVersion)
ipcMain.handle('getLegendaryVersion', getLegendaryVersion)
ipcMain.handle('getGogdlVersion', getGogdlVersion)
ipcMain.handle('isFullscreen', () => isSteamDeckGameMode || isCLIFullscreen)
ipcMain.handle('isFlatpak', () => isFlatpak)

ipcMain.handle('getPlatform', () => process.platform)

ipcMain.handle('showUpdateSetting', () => !isFlatpak)

ipcMain.handle('getNumOfGpus', async (): Promise<number> => {
  const { controllers } = await si.graphics()
  return controllers.length
})

ipcMain.handle('getLatestReleases', async () => {
  const { checkForUpdatesOnStartup } = GlobalConfig.get().config
  if (checkForUpdatesOnStartup) {
    return getLatestReleases()
  } else {
    return []
  }
})

ipcMain.handle('getCurrentChangelog', async () => {
  return getCurrentChangelog()
})

ipcMain.on('clearCache', (event) => {
  clearCache()

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
})

ipcMain.on('resetHeroic', () => resetHeroic())

ipcMain.on('createNewWindow', (e, url) => {
  new BrowserWindow({ height: 700, width: 1200 }).loadURL(url)
})

ipcMain.handle('isGameAvailable', async (e, args) => {
  const { appName, runner } = args
  if (runner === 'sideload') {
    return isAppAvailable(appName)
  }
  const info = getGame(appName, runner).getGameInfo()
  if (info && info.is_installed) {
    if (info.install.install_path && existsSync(info.install.install_path!)) {
      return true
    } else {
      return false
    }
  }
  return false
})

ipcMain.handle('getGameInfo', async (event, appName, runner) => {
  if (runner === 'sideload') {
    return getAppInfo(appName)
  }
  // Fastpath since we sometimes have to request info for a GOG game as Legendary because we don't know it's a GOG game yet
  if (runner === 'legendary' && !LegendaryLibrary.get().hasGame(appName)) {
    return null
  }
  try {
    const game = getGame(appName, runner)
    const info = game.getGameInfo()

    if (!info.app_name) {
      return null
    }

    info.extra = await game.getExtraInfo()
    return info
  } catch (error) {
    logError(error, { prefix: LogPrefix.Backend })
    return null
  }
})

ipcMain.handle('getGameSettings', async (event, appName, runner) => {
  try {
    if (runner === 'sideload') {
      return await getAppSettings(appName)
    }
    return await getGame(appName, runner).getSettings()
  } catch (error) {
    logError(error, { prefix: LogPrefix.Backend })
    return null
  }
})

ipcMain.handle('getGOGLinuxInstallersLangs', async (event, appName) =>
  GOGLibrary.getLinuxInstallersLanguages(appName)
)

ipcMain.handle(
  'getInstallInfo',
  async (event, appName, runner, installPlatform) => {
    try {
      const info = await getGame(appName, runner).getInstallInfo(
        // @ts-expect-error This is actually fine as long as the frontend always passes the right InstallPlatform for the right runner
        installPlatform
      )
      return info
    } catch (error) {
      logError(error, {
        prefix: runner === 'legendary' ? LogPrefix.Legendary : LogPrefix.Gog
      })
      return null
    }
  }
)

ipcMain.handle('getUserInfo', LegendaryUser.getUserInfo)

// Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', LegendaryUser.isLoggedIn)

ipcMain.handle('login', async (event, sid) => LegendaryUser.login(sid))
ipcMain.handle('authGOG', async (event, code) => GOGUser.login(code))
ipcMain.handle('logoutLegendary', LegendaryUser.logout)
ipcMain.on('logoutGOG', GOGUser.logout)

ipcMain.handle('getAlternativeWine', async () =>
  GlobalConfig.get().getAlternativeWine()
)

ipcMain.handle('readConfig', async (event, config_class) => {
  if (config_class === 'library') {
    return LegendaryLibrary.get().getGames()
  }
  const userInfo = await LegendaryUser.getUserInfo()
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
    return mapOtherSettings(GlobalConfig.get().config)
  }
  // We can't use .config since apparently its not loaded fast enough.
  const config = await GameConfig.get(appName).getSettings()
  return mapOtherSettings(config)
})

ipcMain.handle('toggleDXVK', async (event, { winePrefix, winePath, action }) =>
  DXVK.installRemove(winePrefix, winePath, 'dxvk', action)
)

ipcMain.on('toggleVKD3D', (event, { winePrefix, winePath, action }) => {
  DXVK.installRemove(winePrefix, winePath, 'vkd3d', action)
})

ipcMain.handle('writeConfig', (event, { appName, config }) => {
  // use 2 spaces for pretty print
  logInfo(JSON.stringify(config, null, 2), { prefix: LogPrefix.Backend })
  if (appName === 'default') {
    GlobalConfig.get().config = config as AppSettings
    GlobalConfig.get().flush()
    const currentConfigStore = configStore.get('settings', {}) as AppSettings
    configStore.set('settings', { ...currentConfigStore, ...config })
  } else {
    GameConfig.get(appName).config = config as GameSettings
    GameConfig.get(appName).flush()
  }
})

// Watch the installed games file and trigger a refresh on the installed games if something changes
if (existsSync(installed)) {
  let watchTimeout: NodeJS.Timeout | undefined
  watch(installed, () => {
    logInfo('installed.json updated, refreshing library', {
      prefix: LogPrefix.Legendary
    })
    // `watch` might fire twice (while Legendary/we are still writing chunks of the file), which would in turn make LegendaryLibrary fail to
    // decode the JSON data. So instead of immediately calling LegendaryLibrary.get().refreshInstalled(), call it only after no writes happen
    // in a 500ms timespan
    if (watchTimeout) clearTimeout(watchTimeout)
    watchTimeout = setTimeout(LegendaryLibrary.get().refreshInstalled, 500)
  })
}

ipcMain.handle('refreshLibrary', async (e, fullRefresh?, library?) => {
  switch (library) {
    case 'legendary':
      await LegendaryLibrary.get().getGames(fullRefresh)
      break
    case 'gog':
      await GOGLibrary.get().sync()
      break
    default:
      await Promise.allSettled([
        LegendaryLibrary.get().getGames(fullRefresh),
        GOGLibrary.get().sync()
      ])
      break
  }
})

ipcMain.on('logError', (e, err) =>
  logError(err, { prefix: LogPrefix.Frontend })
)

ipcMain.on('logInfo', (e, info) =>
  logInfo(info, { prefix: LogPrefix.Frontend })
)

let powerDisplayId: number | null

ipcMain.handle(
  'launch',
  async (event, { appName, launchArguments, runner }): StatusPromise => {
    launchArguments = isCLINoGui ? '--skip-version-check' : launchArguments

    const window = BrowserWindow.getAllWindows()[0]
    const isSideloaded = runner === 'sideload'
    const extGame = getGame(appName, runner)
    const game = isSideloaded ? getAppInfo(appName) : extGame.getGameInfo()
    const { title } = game

    const { minimizeOnLaunch } = await GlobalConfig.get().getSettings()

    const startPlayingDate = new Date()

    if (!tsStore.has(game.app_name)) {
      tsStore.set(`${game.app_name}.firstPlayed`, startPlayingDate)
    }

    logInfo(`Launching ${title} (${game.app_name})`, {
      prefix: LogPrefix.Backend
    })

    addRecentGame(game)

    window.webContents.send('setGameStatus', {
      appName,
      runner,
      status: 'playing'
    })

    if (minimizeOnLaunch) {
      mainWindow.hide()
    }

    // Prevent display from sleep
    if (!powerDisplayId) {
      logInfo('Preventing display from sleep', { prefix: LogPrefix.Backend })
      powerDisplayId = powerSaveBlocker.start('prevent-display-sleep')
    }

    const systemInfo = await getSystemInfo()
    const gameSettings = isSideloaded
      ? getAppSettings(appName)
      : await extGame.getSettings()
    const gameSettingsString = JSON.stringify(gameSettings, null, '\t')
    const logFileLocation = isSideloaded
      ? appLogFileLocation(appName)
      : extGame.logFileLocation

    writeFileSync(
      logFileLocation,
      'System Info:\n' +
        `${systemInfo}\n` +
        '\n' +
        `Game Settings: ${gameSettingsString}\n` +
        '\n' +
        `Game launched at: ${startPlayingDate}\n` +
        '\n'
    )

    const command = isSideloaded
      ? launchApp(appName)
      : extGame.launch(launchArguments)

    const launchResult = await command.catch((exception) => {
      logError(exception, { prefix: LogPrefix.Backend })
      appendFileSync(
        logFileLocation,
        `An exception occurred when launching the game:\n${exception.stack}`
      )
      return false
    })

    // Stop display sleep blocker
    if (powerDisplayId !== null) {
      logInfo('Stopping Display Power Saver Blocker', {
        prefix: LogPrefix.Backend
      })
      powerSaveBlocker.stop(powerDisplayId)
    }

    // Update playtime and last played date
    const finishedPlayingDate = new Date()
    tsStore.set(`${appName}.lastPlayed`, finishedPlayingDate)
    // Playtime of this session in minutes
    const sessionPlaytime =
      (finishedPlayingDate.getTime() - startPlayingDate.getTime()) / 1000 / 60
    let totalPlaytime = sessionPlaytime
    if (tsStore.has(`${appName}.totalPlayed`)) {
      totalPlaytime += tsStore.get(`${appName}.totalPlayed`) as number
    }
    tsStore.set(`${appName}.totalPlayed`, Math.floor(totalPlaytime))

    window.webContents.send('setGameStatus', {
      appName,
      runner,
      status: 'done'
    })

    // Exit if we've been launched without UI
    if (isCLINoGui) {
      app.exit()
    } else {
      mainWindow.show()
    }

    return { status: launchResult ? 'done' : 'error' }
  }
)

ipcMain.handle('openDialog', async (e, args) => {
  const { filePaths, canceled } = await showOpenDialog(mainWindow, args)
  if (!canceled) {
    return filePaths[0]
  }
  return false
})

ipcMain.on('showItemInFolder', async (e, item) => showItemInFolder(item))

ipcMain.handle(
  'uninstall',
  async (event, appName, runner, shouldRemovePrefix) => {
    const game = getGame(appName, runner)

    const { title } = game.getGameInfo()

    try {
      await game.uninstall()
    } catch (error) {
      notify({
        title,
        body: i18next.t('notify.uninstalled.error', 'Error uninstalling')
      })
      logError(error, { prefix: LogPrefix.Backend })
      return
    }
    if (shouldRemovePrefix) {
      const { winePrefix } = await game.getSettings()
      logInfo(`Removing prefix ${winePrefix}`, {
        prefix: LogPrefix.Backend
      })
      // remove prefix if exists
      if (existsSync(winePrefix)) {
        rmSync(winePrefix, { recursive: true })
      }
    }

    notify({ title, body: i18next.t('notify.uninstalled') })
    logInfo('Finished uninstalling', { prefix: LogPrefix.Backend })
  }
)

ipcMain.handle('repair', async (event, appName, runner) => {
  if (!isOnline()) {
    logWarning(`App offline, skipping repair for game '${appName}'.`, {
      prefix: LogPrefix.Backend
    })
    return
  }
  const game = getGame(appName, runner)
  const { title } = game.getGameInfo()

  try {
    await game.repair()
  } catch (error) {
    notify({
      title,
      body: i18next.t('notify.error.reparing', 'Error Repairing')
    })
    logError(error, { prefix: LogPrefix.Backend })
  }
  notify({ title, body: i18next.t('notify.finished.reparing') })
  logInfo('Finished repairing', { prefix: LogPrefix.Backend })
})

ipcMain.handle(
  'moveInstall',
  async (event, { appName, path, runner }): StatusPromise => {
    const game = getGame(appName, runner)
    const { title } = game.getGameInfo()
    notify({ title, body: i18next.t('notify.moving', 'Moving Game') })
    let newPath: string
    try {
      newPath = await game.moveInstall(path)
    } catch (error) {
      notify({
        title,
        body: i18next.t('notify.error.move', 'Error Moving the Game')
      })
      logError(error, { prefix: LogPrefix.Backend })
      return { status: 'error' }
    }
    notify({ title, body: i18next.t('notify.moved') })
    logInfo(`Finished moving ${appName} to ${newPath}.`, {
      prefix: LogPrefix.Backend
    })
    return { status: 'done' }
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
    const game = getGame(appName, runner)
    const { title } = game.getGameInfo()
    mainWindow.webContents.send('setGameStatus', {
      appName,
      runner,
      status: 'installing'
    })

    const abortMessage = () => {
      notify({ title, body: i18next.t('notify.install.canceled') })
      mainWindow.webContents.send('setGameStatus', {
        appName,
        runner,
        status: 'done'
      })
    }

    try {
      const { abort, error } = await game.import(path, platform)
      if (abort || error) {
        abortMessage()
        return { status: 'done' }
      }
    } catch (error) {
      abortMessage()
      logError(error, { prefix: LogPrefix.Backend })
      return { status: 'error' }
    }

    notify({
      title,
      body: i18next.t('notify.install.imported', 'Game Imported')
    })
    mainWindow.webContents.send('setGameStatus', {
      appName,
      runner,
      status: 'done'
    })
    logInfo(`imported ${title}`, { prefix: LogPrefix.Backend })
    return { status: 'done' }
  }
)

ipcMain.handle('kill', async (event, appName, runner) => {
  callAbortController(appName)
  return runner === 'sideload' ? stop(appName) : getGame(appName, runner).stop()
})

ipcMain.handle('updateGame', async (event, appName, runner): StatusPromise => {
  if (!isOnline()) {
    logWarning(`App offline, skipping install for game '${appName}'.`, {
      prefix: LogPrefix.Backend
    })
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

  const game = getGame(appName, runner)
  const { title } = game.getGameInfo()
  notify({
    title,
    body: i18next.t('notify.update.started', 'Update Started')
  })

  let status: 'done' | 'error' = 'error'
  try {
    status = (await game.update()).status
  } catch (error) {
    logError(error, { prefix: LogPrefix.Backend })
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
  logInfo('finished updating', { prefix: LogPrefix.Backend })
  return { status }
})

ipcMain.handle(
  'changeInstallPath',
  async (event, { appName, path, runner }) => {
    let instance = null
    switch (runner) {
      case 'legendary':
        instance = LegendaryLibrary.get()
        break
      case 'gog':
        instance = GOGLibrary.get()
        break
      default:
        logError(`Unsupported runner ${runner}`, { prefix: LogPrefix.Backend })
        return
    }
    instance.changeGameInstallPath(appName, path)
    logInfo(`Finished moving ${appName} to ${path}.`, {
      prefix: LogPrefix.Backend
    })
  }
)

ipcMain.handle('egsSync', async (event, args) => {
  if (isWindows) {
    const egl_manifestPath =
      'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests'

    if (!existsSync(egl_manifestPath)) {
      mkdirSync(egl_manifestPath, { recursive: true })
    }
  }

  const linkArgs = isWindows
    ? `--enable-sync`
    : `--enable-sync --egl-wine-prefix ${args}`
  const unlinkArgs = `--unlink`
  const isLink = args !== 'unlink'
  const command = isLink ? linkArgs : unlinkArgs
  const { bin, dir } = getLegendaryBin()
  const legendary = path.join(dir, bin)

  try {
    const { stderr, stdout } = await execAsync(
      `${legendary} egl-sync ${command} -y`
    )
    logInfo(`${stdout}`, { prefix: LogPrefix.Legendary })
    if (stderr.includes('ERROR')) {
      logError(`${stderr}`, { prefix: LogPrefix.Legendary })
      return 'Error'
    }
    return `${stdout} - ${stderr}`
  } catch (error) {
    logError(error, { prefix: LogPrefix.Legendary })
    return 'Error'
  }
})

ipcMain.handle('syncGOGSaves', async (event, gogSaves, appName, arg) =>
  getGame(appName, 'gog').syncSaves(arg, '', gogSaves)
)

ipcMain.handle(
  'syncSaves',
  async (event, { arg = '', path, appName, runner }) => {
    if (runner === 'legendary') {
      const epicOffline = await isEpicServiceOffline()
      if (epicOffline) {
        logWarning('Epic is offline right now, cannot sync saves!', {
          prefix: LogPrefix.Backend
        })
        return 'Epic is offline right now, cannot sync saves!'
      }
    }
    if (!isOnline()) {
      logWarning('App is offline, cannot sync saves!', {
        prefix: LogPrefix.Backend
      })
      return 'App is offline, cannot sync saves!'
    }

    const output = await getGame(appName, runner).syncSaves(arg, path)
    logInfo(output, { prefix: LogPrefix.Backend })
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
  const { action, metadata } = args
  const window = BrowserWindow.getAllWindows()[0]
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
        x: window.getBounds().width / 2,
        y: window.getBounds().height / 2
      })
      break
    case 'rightStickDown':
      inputEvents.push({
        type: 'mouseWheel',
        deltaY: -50,
        x: window.getBounds().width / 2,
        y: window.getBounds().height / 2
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
      window.webContents.goBack()
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
    inputEvents.forEach((event) => window.webContents.sendInputEvent(event))
  }
})

ipcMain.handle('getFonts', async (event, reload) => {
  let cachedFonts = (fontsStore.get('fonts', []) as string[]) || []
  if (cachedFonts.length === 0 || reload) {
    cachedFonts = await getFonts()
    cachedFonts = cachedFonts.sort((a, b) => a.localeCompare(b))
    fontsStore.set('fonts', cachedFonts)
  }
  return cachedFonts
})

ipcMain.handle(
  'runWineCommandForGame',
  async (event, { appName, commandParts, runner }) => {
    const game = getGame(appName, runner)
    const isSideloaded = runner === 'sideload'
    const gameSettings = isSideloaded
      ? await getAppSettings(appName)
      : await game.getSettings()

    if (isWindows) {
      return execAsync(commandParts.join(' '))
    }
    const { updated } = await verifyWinePrefix(gameSettings)

    if (runner === 'gog' && updated) {
      await setup(game.appName)
    }

    // FIXME: Why are we using `runinprefix` here?
    return game.runWineCommand(commandParts, false, 'runinprefix')
  }
)

ipcMain.handle('getShellPath', async (event, path) => getShellPath(path))

ipcMain.handle('clipboardReadText', () => clipboard.readText())

ipcMain.on('clipboardWriteText', (e, text) => clipboard.writeText(text))

ipcMain.handle('getCustomThemes', async () => {
  const { customThemesPath } = await GlobalConfig.get().getSettings()

  if (!existsSync(customThemesPath)) {
    return []
  }

  return readdirSync(customThemesPath).filter((fileName) =>
    fileName.endsWith('.css')
  )
})

ipcMain.handle('getThemeCSS', async (event, theme) => {
  const { customThemesPath } = await GlobalConfig.get().getSettings()

  const cssPath = path.join(customThemesPath, theme)

  if (!existsSync(cssPath)) {
    return ''
  }

  return readFileSync(cssPath, 'utf-8')
})

ipcMain.on('addNewApp', (e, args) => addNewApp(args))

ipcMain.handle('removeApp', async (e, args) => removeApp(args))

ipcMain.handle('launchApp', async (e, appName) => launchApp(appName))

ipcMain.handle('isNative', (e, { appName, runner }) => {
  if (runner === 'sideload') {
    return isNativeApp(appName)
  }
  const game = getGame(appName, runner)
  return game.isNative()
})

/*
  Other Keys that should go into translation files:
  t('box.error.generic.title')
  t('box.error.generic.message')
 */

/*
 * INSERT OTHER IPC HANLDER HERE
 */
import './logger/ipc_handler'
import './wine/manager/ipc_handler'
import './shortcuts/ipc_handler'
import './anticheat/ipc_handler'
import './legendary/eos_overlay/ipc_handler'
import './wine/runtimes/ipc_handler'
import './downloadmanager/ipc_handler'
import './utils/ipc_handler'
import './howlongtobeat/ipc_handler'

// import Store from 'electron-store'
// interface StoreMap {
//   [key: string]: Store
// }
// const stores: StoreMap = {}

// ipcMain.on('storeNew', (event, storeName, options) => {
//   stores[storeName] = new Store(options)
// })

// ipcMain.handle('storeHas', (event, storeName, key) => {
//   return stores[storeName].has(key)
// })

// ipcMain.handle('storeGet', (event, storeName, key) => {
//   return stores[storeName].get(key)
// })

// ipcMain.on('storeSet', (event, storeName, key, value) => {
//   stores[storeName].set(key, value)
// })
