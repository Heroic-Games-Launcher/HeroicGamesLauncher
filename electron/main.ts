import { InstallParams, LaunchResult } from './types'
import * as path from 'path'
import {
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  app,
  dialog,
  ipcMain,
  powerSaveBlocker,
  protocol
} from 'electron'
import { cpus, platform } from 'os'
import {
  existsSync,
  mkdirSync,
  rmdirSync,
  unlinkSync,
  watch,
  writeFile
} from 'graceful-fs'
import Backend from 'i18next-fs-backend'
import i18next from 'i18next'
import isDev from 'electron-is-dev'

import { DXVK } from './dxvk'
import { Game } from './games'
import { GameConfig } from './game_config'
import { GlobalConfig } from './config'
import { LegendaryLibrary } from './legendary/library'
import { LegendaryUser } from './legendary/user'
import {
  checkCommandVersion,
  checkForUpdates,
  clearCache,
  errorHandler,
  execAsync,
  getLegendaryVersion,
  getSystemInfo,
  handleExit,
  isOnline,
  openUrlOrFile,
  resetHeroic,
  showAboutWindow
} from './utils'
import {
  discordLink,
  execOptions,
  getShell,
  heroicGamesConfigPath,
  heroicGithubURL,
  home,
  icon,
  iconDark,
  iconLight,
  installed,
  kofiPage,
  legendaryBin,
  loginUrl,
  patreonPage,
  sidInfoUrl,
  supportURL,
  weblateUrl,
  wikiLink
} from './constants'
import { handleProtocol } from './protocol'
import { logError, logInfo, logWarning } from './logger'
import Store from 'electron-store'

const { showErrorBox, showMessageBox, showOpenDialog } = dialog
const isWindows = platform() === 'win32'

let mainWindow: BrowserWindow = null
const store = new Store({
  cwd: 'store'
})

const gameInfoStore = new Store({
  cwd: 'lib-cache',
  name: 'gameinfo'
})
const tsStore = new Store({
  cwd: 'store',
  name: 'timestamp'
})

async function createWindow(): Promise<BrowserWindow> {
  const { exitToTray, startInTray } = await GlobalConfig.get().getSettings()

  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 690,
    minHeight: 650,
    minWidth: 1100,
    width: 1200,
    show: !(exitToTray && startInTray),
    webPreferences: {
      webviewTag: true,
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  setTimeout(() => {
    if (process.platform === 'linux') {
      DXVK.getLatest()
    }
  }, 2500)

  GlobalConfig.get()
  LegendaryLibrary.get()

  mainWindow.setIcon(icon)
  app.setAppUserModelId('Heroic')

  if (isDev) {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    //@ts-ignore
    import('electron-devtools-installer').then((devtools) => {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = devtools

      installExtension(REACT_DEVELOPER_TOOLS).catch((err: string) => {
        logError('An error occurred: ', err)
      })
    })
    mainWindow.loadURL('http://localhost:3000')
    // Open the DevTools.
    mainWindow.webContents.openDevTools()

    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = await GlobalConfig.get().config

      if (exitToTray) {
        return mainWindow.hide()
      }

      return await handleExit()
    })
  } else {
    Menu.setApplicationMenu(null)

    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = await GlobalConfig.get().config

      if (exitToTray) {
        return mainWindow.hide()
      }
      return handleExit()
    })
    mainWindow.loadURL(`file://${path.join(__dirname, '../build/index.html')}`)

    return mainWindow
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let appIcon: Tray = null
const gotTheLock = app.requestSingleInstanceLock()

const contextMenu = () => {
  const recentGames: Array<RecentGame> =
    (store.get('games.recent') as Array<RecentGame>) || []
  const recentsMenu = recentGames.map((game) => {
    return {
      click: function () {
        openUrlOrFile(`heroic://launch/${game.appName}`)
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
        handleExit()
      },
      label: i18next.t('tray.quit', 'Quit'),
      accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q'
    }
  ])
}

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      mainWindow.show()
    }
    if (argv[1]) {
      const url = argv[1]
      handleProtocol(mainWindow, url)
    }
  })
  app.whenReady().then(async () => {
    const systemInfo = await getSystemInfo()
    logInfo(`${systemInfo}`)
    // We can't use .config since apparently its not loaded fast enough.
    const { language, darkTrayIcon } = await GlobalConfig.get().getSettings()
    const isLoggedIn = await LegendaryUser.isLoggedIn()

    if (!isLoggedIn) {
      logInfo('User Not Found, removing it from Store')
      store.delete('userinfo')
    }

    await i18next.use(Backend).init({
      backend: {
        addPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}'),
        allowMultiLoading: false,
        loadPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}.json')
      },
      debug: false,
      fallbackLng: 'en',
      lng: language,
      supportedLngs: [
        'bg',
        'ca',
        'cs',
        'de',
        'el',
        'en',
        'es',
        'et',
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
        'nl',
        'pl',
        'pt',
        'pt_BR',
        'ru',
        'sv',
        'ta',
        'tr',
        'zh_Hans',
        'zh_Hant'
      ]
    })

    await createWindow()

    protocol.registerStringProtocol('heroic', (request, callback) => {
      handleProtocol(mainWindow, request.url)
      callback('Operation initiated.')
    })
    if (!app.isDefaultProtocolClient('heroic')) {
      if (app.setAsDefaultProtocolClient('heroic')) {
        logInfo('Registered protocol with OS.')
      } else {
        logError('Failed to register protocol with OS.')
      }
    } else {
      logWarning('Protocol already registered.')
    }
    if (process.argv[1]) {
      const url = process.argv[1]
      handleProtocol(mainWindow, url)
    }

    const trayIcon = darkTrayIcon ? iconDark : iconLight
    appIcon = new Tray(trayIcon)

    appIcon.setContextMenu(contextMenu())
    appIcon.setToolTip('Heroic')
    ipcMain.on('changeLanguage', async (event, language: string) => {
      logInfo('Changing Language to:', language)
      await i18next.changeLanguage(language)
      gameInfoStore.clear()
      appIcon.setContextMenu(contextMenu())
    })

    ipcMain.addListener('changeTrayColor', () => {
      logInfo('Changing Tray icon Color...')
      setTimeout(async () => {
        const { darkTrayIcon } = await GlobalConfig.get().getSettings()
        const trayIcon = darkTrayIcon ? iconDark : iconLight
        appIcon.setImage(trayIcon)
        appIcon.setContextMenu(contextMenu())
      }, 500)
    })

    if (process.platform === 'linux') {
      const found = await checkCommandVersion(
        ['python', 'python3'],
        '3.8.0',
        false
      )

      if (!found) {
        logError('Heroic requires Python 3.8 or newer.')
      }
    }

    return
  })
}

type NotifyType = {
  title: string
  body: string
}

function notify({ body, title }: NotifyType) {
  const notify = new Notification({
    body,
    title
  })

  notify.on('click', () => mainWindow.show())
  notify.show()
}

ipcMain.on('Notify', (event, args) => {
  const notify = new Notification({
    body: args[1],
    title: args[0]
  })

  notify.on('click', () => mainWindow.show())
  notify.show()
})

// Maybe this can help with white screens
process.on('uncaughtException', (err) => {
  logError(`${err.name}: ${err.message}`)
})

let powerId: number | null
ipcMain.on('lock', () => {
  if (!existsSync(`${heroicGamesConfigPath}/lock`)) {
    writeFile(`${heroicGamesConfigPath}/lock`, '', () => 'done')
    if (!powerId) {
      powerId = powerSaveBlocker.start('prevent-app-suspension')
      return powerId
    }
  }
})

ipcMain.on('unlock', () => {
  if (existsSync(`${heroicGamesConfigPath}/lock`)) {
    unlinkSync(`${heroicGamesConfigPath}/lock`)
    if (powerId) {
      return powerSaveBlocker.stop(powerId)
    }
  }
})

ipcMain.handle('kill', async (event, appName) => {
  return await Game.get(appName).stop()
})

ipcMain.on('quit', async () => handleExit())

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
  handleProtocol(mainWindow, url)
})

ipcMain.on('openFolder', (event, folder) => openUrlOrFile(folder))
ipcMain.on('openSupportPage', () => openUrlOrFile(supportURL))
ipcMain.on('openReleases', () => openUrlOrFile(heroicGithubURL))
ipcMain.on('openWeblate', () => openUrlOrFile(weblateUrl))
ipcMain.on('showAboutWindow', () => showAboutWindow())
ipcMain.on('openLoginPage', () => openUrlOrFile(loginUrl))
ipcMain.on('openDiscordLink', () => openUrlOrFile(discordLink))
ipcMain.on('openPatreonPage', () => openUrlOrFile(patreonPage))
ipcMain.on('openKofiPage', () => openUrlOrFile(kofiPage))
ipcMain.on('openWikiLink', () => openUrlOrFile(wikiLink))
ipcMain.on('openSidInfoPage', () => openUrlOrFile(sidInfoUrl))

ipcMain.on('getLog', (event, appName) =>
  openUrlOrFile(`${heroicGamesConfigPath}${appName}-lastPlay.log`)
)

ipcMain.on('removeFolder', async (e, [path, folderName]) => {
  if (path === 'default') {
    const { defaultInstallPath } = await GlobalConfig.get().getSettings()
    const path = defaultInstallPath.replaceAll("'", '')
    const folderToDelete = `${path}/${folderName}`
    return setTimeout(() => {
      rmdirSync(folderToDelete, { recursive: true })
    }, 5000)
  }

  const folderToDelete = `${path}/${folderName}`.replaceAll("'", '')
  return setTimeout(() => {
    rmdirSync(folderToDelete, { recursive: true })
  }, 2000)
})

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
interface Tools {
  exe: string
  prefix: string
  tool: string
  wine: string
}

ipcMain.handle(
  'callTool',
  async (event, { tool, wine, prefix, exe }: Tools) => {
    const newProtonWinePath = wine.replace("proton'", "files/bin/wine64'")
    const oldProtonWinePath = wine.replace("proton'", "dist/bin/wine64'")
    const isProton = wine.includes('proton')

    // existsSync is weird because it returns false always if the path has single-quotes in it
    const protonWinePath = existsSync(newProtonWinePath.replaceAll("'", ''))
      ? newProtonWinePath
      : oldProtonWinePath
    let wineBin = isProton ? protonWinePath : wine
    let winePrefix: string = prefix.replace('~', home)

    if (wine.includes('proton')) {
      const protonPrefix = winePrefix.replaceAll("'", '')
      winePrefix = `${protonPrefix}/pfx`

      logWarning(
        'Using Winecfg and Winetricks with Proton might not work as expected.'
      )
      // workaround for proton since newer versions doesnt come with a wine binary anymore.
      if (!existsSync(wineBin.replaceAll("'", ''))) {
        logInfo(
          `${wineBin} not found for this Proton version, will try using default wine`
        )
        wineBin = '/usr/bin/wine'
      }
    }

    let command = `WINE=${wineBin} WINEPREFIX='${winePrefix}' ${
      tool === 'winecfg' ? `${wineBin} ${tool}` : tool
    }`

    if (tool === 'runExe') {
      command = `WINEPREFIX='${winePrefix}' ${wineBin} '${exe}'`
    }

    logInfo('trying to run', command)
    try {
      await execAsync(command, execOptions)
    } catch (error) {
      logError(
        `Something went wrong! Check if ${tool} is available and ${wineBin} exists`
      )
    }
  }
)

/// IPC handlers begin here.

ipcMain.handle('checkGameUpdates', () =>
  LegendaryLibrary.get().listUpdateableGames()
)

// Not ready to be used safely yet.
ipcMain.handle('updateAll', () => LegendaryLibrary.get().updateAllGames())

ipcMain.handle('checkVersion', () => checkForUpdates())

ipcMain.handle('getMaxCpus', () => cpus().length)

ipcMain.handle('getLegendaryVersion', async () => getLegendaryVersion())

ipcMain.handle('getPlatform', () => process.platform)

ipcMain.on('clearCache', () => {
  clearCache()
  dialog.showMessageBox({
    title: i18next.t('box.cache-cleared.title', 'Cache Cleared'),
    message: i18next.t(
      'box.cache-cleared.message',
      'Heroic Cache Was Cleared!'
    ),
    buttons: [i18next.t('box.ok', 'Ok')]
  })
})

ipcMain.on('resetHeroic', async () => {
  const { response } = await dialog.showMessageBox({
    title: i18next.t('box.reset-heroic.question.title', 'Reset Heroic'),
    message: i18next.t(
      'box.reset-heroic.question.message',
      "Are you sure you want to reset Heroic? This will remove all Settings and Caching but won't remove your Installed games or your Epic credentials"
    ),
    buttons: [i18next.t('box.no'), i18next.t('box.yes')]
  })

  if (response === 1) {
    resetHeroic()
  }
})

ipcMain.on('createNewWindow', (e, url) =>
  new BrowserWindow({ height: 700, width: 1200 }).loadURL(url)
)

ipcMain.handle('getGameInfo', async (event, game) => {
  try {
    const info = await Game.get(game).getGameInfo()
    info.extra = await Game.get(game).getExtraInfo(info.namespace)
    return info
  } catch (error) {
    logError(error)
  }
})

ipcMain.handle('getInstallInfo', async (event, game) => {
  const online = await isOnline()
  if (!online) {
    return { game: {}, metadata: {} }
  }
  try {
    const info = await Game.get(game).getInstallInfo()
    return info
  } catch (error) {
    logError(error)
    return {}
  }
})

ipcMain.handle('getUserInfo', async () => await LegendaryUser.getUserInfo())

// Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', async () => await LegendaryUser.isLoggedIn())

ipcMain.handle('login', async (event, sid) => await LegendaryUser.login(sid))

ipcMain.handle('logout', async () => await LegendaryUser.logout())

ipcMain.handle('getAlternativeWine', () =>
  GlobalConfig.get().getAlternativeWine()
)

ipcMain.handle('readConfig', async (event, config_class) => {
  switch (config_class) {
    case 'library':
      return await LegendaryLibrary.get().getGames('info')
    case 'user':
      return (await LegendaryUser.getUserInfo()).displayName
    default:
      logError(`Which idiot requested '${config_class}' using readConfig?`)
      return {}
  }
})

ipcMain.handle('requestSettings', async (event, appName) => {
  if (appName === 'default') {
    return GlobalConfig.get().config
  }
  // We can't use .config since apparently its not loaded fast enough.
  return await GameConfig.get(appName).getSettings()
})

ipcMain.on('toggleDXVK', (event, [{ winePrefix, winePath }, action]) =>
  DXVK.installRemove(winePrefix, winePath, 'dxvk', action)
)

ipcMain.handle('writeConfig', (event, [appName, config]) => {
  if (appName === 'default') {
    GlobalConfig.get().config = config
    GlobalConfig.get().flush()
  } else {
    GameConfig.get(appName).config = config
    GameConfig.get(appName).flush()
  }
})

// Watch the installed games file and trigger a refresh on the installed games if something changes
if (existsSync(installed)) {
  watch(installed, () => {
    logInfo('Legendary: Installed game list updated')
    LegendaryLibrary.get().refreshInstalled()
  })
}

ipcMain.handle('refreshLibrary', async (e, fullRefresh) => {
  return await LegendaryLibrary.get().getGames('info', fullRefresh)
})

ipcMain.on('logError', (e, err) => logError(`Frontend: ${err}`))
ipcMain.on('logInfo', (e, info) => logInfo(`Frontend: ${info}`))

type RecentGame = {
  appName: string
  title: string
}

type LaunchParams = {
  appName: string
  launchArguments: string
}

ipcMain.handle(
  'launch',
  async (event, { appName, launchArguments }: LaunchParams) => {
    const window = BrowserWindow.getAllWindows()[0]
    window.webContents.send('setGameStatus', {
      appName,
      status: 'playing'
    })
    const recentGames = (store.get('games.recent') as Array<RecentGame>) || []
    const game = appName.split(' ')[0]
    const { title } = await Game.get(game).getGameInfo()
    const MAX_RECENT_GAMES = GlobalConfig.get().config.maxRecentGames || 5
    const startPlayingDate = new Date()

    if (!tsStore.has(game)) {
      tsStore.set(`${game}.firstPlayed`, startPlayingDate)
    }

    logInfo('launching', title, game)

    if (recentGames.length) {
      let updatedRecentGames = recentGames.filter((a) => a.appName !== game)
      if (updatedRecentGames.length > MAX_RECENT_GAMES) {
        const newArr = []
        for (let i = 0; i <= MAX_RECENT_GAMES; i++) {
          newArr.push(updatedRecentGames[i])
        }
        updatedRecentGames = newArr
      }
      if (updatedRecentGames.length === MAX_RECENT_GAMES) {
        updatedRecentGames.pop()
      }
      updatedRecentGames.unshift({ appName: game, title })
      store.set('games.recent', updatedRecentGames)
    } else {
      store.set('games.recent', [{ game, title: title }])
    }

    return Game.get(appName)
      .launch(launchArguments)
      .then(async ({ stderr, command, gameSettings }: LaunchResult) => {
        const finishedPlayingDate = new Date()
        tsStore.set(`${game}.lastPlayed`, finishedPlayingDate)
        const sessionPlayingTime =
          (Number(finishedPlayingDate) - Number(startPlayingDate)) / 1000 / 60
        const totalPlayedTime: number = tsStore.has(`${game}.totalPlayed`)
          ? (tsStore.get(`${game}.totalPlayed`) as number) + sessionPlayingTime
          : sessionPlayingTime
        // I'll send the calculated time here because then the user can set it manually on the file if desired
        tsStore.set(`${game}.totalPlayed`, Math.floor(totalPlayedTime))
        const systemInfo = await getSystemInfo()

        const logResult = `Launch Command: ${command}
        System Info:
        ${systemInfo}
        Game Settings: ${JSON.stringify(gameSettings, null, '\t')}

        Legendary Log:
        ${stderr}
        `

        if (stderr.includes('Errno')) {
          showErrorBox(
            i18next.t('box.error.title', 'Something Went Wrong'),
            i18next.t(
              'box.error.launch',
              'Error when launching the game, check the logs!'
            )
          )
        }
        window.webContents.send('setGameStatus', {
          appName,
          status: 'done'
        })

        writeFile(
          `${heroicGamesConfigPath}${game}-lastPlay.log`,
          logResult,
          () => logInfo('Log was written')
        )
        return stderr
      })
      .catch(async (exception) => {
        const stderr = `${exception.name} - ${exception.message}`
        errorHandler({ error: { stderr, stdout: '' } })
        writeFile(
          `${heroicGamesConfigPath}${game}-lastPlay.log`,
          stderr,
          () => 'done'
        )
        logError(stderr)
        window.webContents.send('setGameStatus', {
          appName,
          status: 'done'
        })
        return stderr
      })
  }
)

ipcMain.handle('openDialog', async (e, args) => {
  const { filePaths, canceled } = await showOpenDialog({
    ...args
  })
  if (filePaths[0]) {
    return { path: filePaths[0] }
  }
  return { canceled }
})

const openMessageBox = async (args: Electron.MessageBoxOptions) => {
  const { response } = await showMessageBox({ ...args })
  return { response }
}

ipcMain.handle(
  'openMessageBox',
  async (_, args: Electron.MessageBoxOptions) => {
    return openMessageBox(args)
  }
)

ipcMain.handle(
  'showErrorBox',
  async (e, args: [title: string, message: string]) => {
    const [title, content] = args
    return showErrorBox(title, content)
  }
)

ipcMain.handle('install', async (event, params) => {
  const { appName, path, installDlcs, sdlList } = params as InstallParams
  const { title, is_mac_native } = await Game.get(appName).getGameInfo()
  const platformToInstall =
    platform() === 'darwin' && is_mac_native ? 'Mac' : 'Windows'

  if (!(await isOnline())) {
    logWarning(`App offline, skipping install for game '${title}'.`)
    return
  }

  mainWindow.webContents.send('setGameStatus', {
    appName,
    status: 'installing',
    folder: path
  })

  notify({
    title,
    body: i18next.t('notify.install.startInstall', 'Installation Started')
  })
  return Game.get(appName)
    .install({ path, installDlcs, sdlList, platformToInstall })
    .then(async (res) => {
      notify({
        title,
        body:
          res.status === 'done'
            ? i18next.t('notify.install.finished')
            : i18next.t('notify.install.canceled')
      })
      logInfo('finished installing')
      mainWindow.webContents.send('setGameStatus', {
        appName,
        status: 'done'
      })
      return res
    })
    .catch((res) => {
      notify({ title, body: i18next.t('notify.install.canceled') })
      mainWindow.webContents.send('setGameStatus', {
        appName,
        status: 'done'
      })
      return res
    })
})

ipcMain.handle('uninstall', async (event, game) => {
  const title = (await Game.get(game).getGameInfo()).title

  return Game.get(game)
    .uninstall()
    .then(() => {
      notify({ title, body: i18next.t('notify.uninstalled') })
      logInfo('finished uninstalling')
    })
    .catch(logError)
})

ipcMain.handle('repair', async (event, game) => {
  if (!(await isOnline())) {
    logWarning(`App offline, skipping repair for game '${game}'.`)
    return
  }
  const title = (await Game.get(game).getGameInfo()).title

  return Game.get(game)
    .repair()
    .then(() => {
      notify({ title, body: i18next.t('notify.finished.reparing') })
      logInfo('finished repairing')
    })
    .catch((error) => {
      notify({
        title,
        body: i18next.t('notify.error.reparing', 'Error Repairing')
      })
      logError(error)
    })
})

ipcMain.handle('moveInstall', async (event, [appName, path]: string[]) => {
  const title = (await Game.get(appName).getGameInfo()).title
  try {
    const newPath = await Game.get(appName).moveInstall(path)
    notify({ title, body: i18next.t('notify.moved') })
    logInfo(`Finished moving ${appName} to ${newPath}.`)
  } catch (error) {
    notify({
      title,
      body: i18next.t('notify.error.move', 'Error Moving the Game')
    })
    logError(error)
  }
})

ipcMain.handle('importGame', async (event, args) => {
  const { appName, path } = args
  const title = (await Game.get(appName).getGameInfo()).title
  mainWindow.webContents.send('setGameStatus', {
    appName,
    status: 'installing'
  })
  Game.get(appName)
    .import(path)
    .then(() => {
      notify({
        title,
        body: i18next.t('notify.install.imported', 'Game Imported')
      })
      mainWindow.webContents.send('setGameStatus', {
        appName,
        status: 'done'
      })
      logInfo(`imported ${title}`)
    })
    .catch((err) => {
      notify({ title, body: i18next.t('notify.install.canceled') })
      mainWindow.webContents.send('setGameStatus', {
        appName,
        status: 'done'
      })
      logInfo(err)
    })
})

ipcMain.handle('updateGame', async (e, game) => {
  if (!(await isOnline())) {
    logWarning(`App offline, skipping install for game '${game}'.`)
    return
  }

  const title = (await Game.get(game).getGameInfo()).title
  notify({ title, body: i18next.t('notify.update.started', 'Update Started') })

  return Game.get(game)
    .update()
    .then(({ status }) => {
      notify({
        title,
        body:
          status === 'done'
            ? i18next.t('notify.update.finished')
            : i18next.t('notify.update.canceled')
      })
      logInfo('finished updating')
    })
    .catch((err) => {
      logError(err)
      notify({ title, body: i18next.t('notify.update.canceled') })
      return err
    })
})

ipcMain.handle('requestGameProgress', async (event, appName) => {
  const logPath = `${heroicGamesConfigPath}${appName}.log`
  // eslint-disable-next-line no-debugger
  debugger
  if (!existsSync(logPath)) {
    return {}
  }

  const unix_progress_command = `tail ${logPath} | grep 'Progress: ' | awk '{print $5, $11}' | tail -1`
  const win_progress_command = `cat ${logPath} -Tail 10 | Select-String -Pattern 'Progress:'`
  const progress_command = isWindows
    ? win_progress_command
    : unix_progress_command

  const unix_downloaded_command = `tail ${logPath} | grep 'Downloaded: ' | awk '{print $5}' | tail -1`
  const win_downloaded_command = `cat ${logPath} -Tail 10 | Select-String -Pattern 'Downloaded:'`
  const downloaded_command = isWindows
    ? win_downloaded_command
    : unix_downloaded_command

  const { stdout: progress_result } = await execAsync(progress_command, {
    shell: getShell()
  })
  const { stdout: downloaded_result } = await execAsync(downloaded_command, {
    shell: getShell()
  })

  let percent = ''
  let eta = ''
  let bytes = ''
  if (isWindows) {
    percent = progress_result.split(' ')[4]
    eta = progress_result.split(' ')[10]
    bytes = downloaded_result.split(' ')[5] + 'MiB'
  }

  if (!isWindows) {
    percent = progress_result.split(' ')[0]
    eta = progress_result.split(' ')[1]
    bytes = downloaded_result + 'MiB'
  }

  const progress = { bytes, eta, percent }
  logInfo(
    `Progress: ${appName} ${progress.percent}/${progress.bytes}/${progress.eta}`
  )
  return progress
})

ipcMain.handle(
  'changeInstallPath',
  async (event, [appName, newPath]: string[]) => {
    LegendaryLibrary.get().changeGameInstallPath(appName, newPath)
    logInfo(`Finished moving ${appName} to ${newPath}.`)
  }
)

ipcMain.handle('egsSync', async (event, args) => {
  const egl_manifestPath =
    'C:/ProgramData/Epic/EpicGamesLauncher/Data/Manifests'

  if (isWindows) {
    if (!existsSync(egl_manifestPath)) {
      mkdirSync(egl_manifestPath)
    }
  }

  const linkArgs = isWindows
    ? `--enable-sync`
    : `--enable-sync --egl-wine-prefix ${args}`
  const unlinkArgs = `--unlink`
  const isLink = args !== 'unlink'
  const command = isLink ? linkArgs : unlinkArgs

  try {
    const { stderr, stdout } = await execAsync(
      `${legendaryBin} egl-sync ${command} -y`
    )
    logInfo(`${stdout}`)
    logError(`${stderr}`)
    return `${stdout} - ${stderr}`
  } catch (error) {
    return 'Error'
  }
})

ipcMain.on('addShortcut', async (event, appName: string, fromMenu: boolean) => {
  const game = Game.get(appName)
  game.addShortcuts(fromMenu)
  openMessageBox({
    buttons: [i18next.t('box.ok', 'Ok')],
    message: i18next.t(
      'box.shortcuts.message',
      'Shortcuts were created on Desktop and Start Menu'
    ),
    title: i18next.t('box.shortcuts.title', 'Shortcuts')
  })
})

ipcMain.on('removeShortcut', async (event, appName: string) => {
  const game = Game.get(appName)
  game.removeShortcuts()
})

ipcMain.handle('syncSaves', async (event, args) => {
  const [arg = '', path, appName] = args
  if (!(await isOnline())) {
    logWarning(`App offline, skipping syncing saves for game '${appName}'.`)
    return
  }

  const { stderr, stdout } = await Game.get(appName).syncSaves(arg, path)
  logInfo(`${stdout}`)
  logError(`${stderr}`)
  return `\n ${stdout} - ${stderr}`
})
