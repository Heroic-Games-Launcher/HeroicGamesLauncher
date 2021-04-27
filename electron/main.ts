import * as path from 'path'

import { Logger } from './logger'

import {
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  app,
  ipcMain,
  powerSaveBlocker,
  protocol
} from 'electron'
import { cpus } from 'os'
import {
  exec,
  spawn
} from 'child_process'
import {
  existsSync,
  rmdirSync,
  unlinkSync,
  writeFile
} from 'graceful-fs'

import Backend from 'i18next-fs-backend'
import i18next from 'i18next'
import isDev from 'electron-is-dev'

import { DXVK } from './dxvk'
import { GameConfig } from './game_config'
import { GlobalConfig } from './config'
import { LegendaryGame } from './games'
import { Library } from './legendary_utils/library'
import { User } from './legendary_utils/user';
import {
  checkForUpdates,
  execAsync,
  handleExit,
  isOnline,
  openUrlOrFile,
  showAboutWindow
} from './utils'
import { dialog } from 'electron'
import {
  discordLink,
  heroicGamesConfigPath,
  heroicGithubURL,
  home,
  iconDark,
  iconLight,
  legendaryBin,
  loginUrl,
  sidInfoUrl,
  supportURL
} from './constants'
import { handleProtocol } from './protocol'

const { showErrorBox } = dialog

let mainWindow: BrowserWindow = null

function createWindow(): BrowserWindow {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: isDev ? 1200 : 720,
    minHeight: 700,
    minWidth: 1200,
    webPreferences: {
      contextIsolation: false,
      enableRemoteModule: true,
      nodeIntegration: true
    },
    width: isDev ? 1800 : 1280
  })

  setTimeout(() => {
    DXVK.getLatest()
  }, 2500)

  GlobalConfig.get()
  Library.get()

  if (isDev) {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    //@ts-ignore
    import('electron-devtools-installer').then((devtools) => {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = devtools

      installExtension(REACT_DEVELOPER_TOOLS).catch((err: string) => {
        console.log('An error occurred: ', err)
      })
    })
    mainWindow.loadURL('http://localhost:3000')
    // Open the DevTools.
    mainWindow.webContents.openDevTools()

    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = (await GlobalConfig.get().config)

      if (exitToTray) {
        return mainWindow.hide()
      }

      return await handleExit()
    })
  } else {
    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = (await GlobalConfig.get().config)

      if (exitToTray) {
        return mainWindow.hide()
      }
      return handleExit()
    })
    mainWindow.loadURL(`file://${path.join(__dirname, '../build/index.html')}`)
    mainWindow.setMenu(null)

    return mainWindow
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let appIcon: Tray = null
const gotTheLock = app.requestSingleInstanceLock()

const contextMenu = () =>
  Menu.buildFromTemplate([
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
      click: function () {
        openUrlOrFile(heroicGithubURL)
      },
      label: 'GitHub'
    },
    {
      click: function () {
        openUrlOrFile(supportURL)
      },
      label: i18next.t('tray.support', 'Support Us')
    },
    {
      accelerator: 'ctrl + R',
      click: function () {
        mainWindow.reload()
      },
      label: i18next.t('tray.reload', 'Reload')
    },
    {
      click: function () {
        handleExit()
      },
      label: i18next.t('tray.quit', 'Quit')
    }
  ])

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
    // We can't use .config since apparently its not loaded fast enough.
    const { language, darkTrayIcon } = await GlobalConfig.get().getSettings()

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
        'de',
        'en',
        'es',
        'fr',
        'nl',
        'pl',
        'pt',
        'ru',
        'tr',
        'hu',
        'it',
        'ml',
        'cs'
      ]
    })

    createWindow()

    protocol.registerStringProtocol('heroic', (request, callback) => {
      handleProtocol(mainWindow, request.url)
      callback('Operation initiated.')
    })
    if (!app.isDefaultProtocolClient('heroic')) {
      if (app.setAsDefaultProtocolClient('heroic')) {
        console.log('Registered protocol with OS.')
      } else {
        console.log('Failed to register protocol with OS.')
      }
    } else {
      console.log('Protocol already registered.')
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
      await i18next.changeLanguage(language)
      appIcon.setContextMenu(contextMenu())
    })

    return
  })
}

ipcMain.on('Notify', (event, args) => {
  Logger.info({message: 'Attempting to notify user ', service: 'notify'})
  const notify = new Notification({
    body: args[1],
    title: args[0]
  })

  notify.on('click', () => mainWindow.show())
  notify.show()
})

// Maybe this can help with white screens
process.on('uncaughtException', (err) => {
  console.log(err)
})

let powerId: number | null
ipcMain.on('lock', () => {
  Logger.info({message: 'Attempting to lock ', service: 'lock'})
  if (!existsSync(`${heroicGamesConfigPath}/lock`)) {
    writeFile(`${heroicGamesConfigPath}/lock`, '', () => 'done')
    if (!powerId) {
      powerId = powerSaveBlocker.start('prevent-app-suspension')
    }
  }
})

ipcMain.on('unlock', () => {
  Logger.info({message: 'Attempting to unlock ', service: 'unlock'})
  if (existsSync(`${heroicGamesConfigPath}/lock`)) {
    unlinkSync(`${heroicGamesConfigPath}/lock`)
    if (powerId) {
      powerSaveBlocker.stop(powerId)
    }
  }
})

ipcMain.on('kill', (event, game) => {
  Logger.info({message: `Attempting to kill game ${game} `, service: 'kill game'})
  // until the legendary bug gets fixed, kill legendary on mac
  // not a perfect solution but it's the only choice for now
  game = process.platform === 'darwin' ? 'legendary' : game
  console.log('killing', game)
  return spawn('pkill', ['-f', game])
})

ipcMain.on('quit', async () => {Logger.info({message: 'Attempting to run quit ', service: 'quit'}); handleExit();})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('open-url', (event, url) => {
  Logger.info({message: `Attempting to run open url ${url} `, service: 'open-url'})
  event.preventDefault()
  handleProtocol(mainWindow, url)
})

ipcMain.on('openFolder', (event, folder) => {Logger.info({message: `Attempting to open folder ${folder}`, service: 'openFolder'}); openUrlOrFile(folder)})

ipcMain.on('openSupportPage', () => {Logger.info({message: 'Attempting to run open support page: ', service: 'openSupportPage'}); openUrlOrFile(supportURL)})

ipcMain.on('openReleases', () => {Logger.info({message: 'Attempting to show releases ', service: 'openReleases'}); openUrlOrFile(heroicGithubURL)})

ipcMain.on('showAboutWindow', () => {Logger.info({message: 'Attempting to show about window ', service: 'showAboutWindow'}); showAboutWindow()})

ipcMain.on('openLoginPage', () => {Logger.info({message: 'Attempting to open login page ', service: 'openLoginpage'}); openUrlOrFile(loginUrl)})

ipcMain.on('openDiscordLink', () => {Logger.info({message: 'Attempting to open discord link ', service: 'openDiscordLink'}); openUrlOrFile(discordLink)})

ipcMain.on('openSidInfoPage', () => {Logger.info({message: 'Attempting to open sid info page ', service: 'openSidInfoPage'}); openUrlOrFile(sidInfoUrl)})

ipcMain.on('getLog', (event, appName) => {
  Logger.info({message: `Attempting to get wine log for ${appName}`, service: 'getLog'})
  openUrlOrFile(`"${heroicGamesConfigPath}/${appName}-lastPlay.log"`)
})


ipcMain.on('removeFolder', async (e, [path, folderName]) => {
  Logger.info({message: `Attempting to remove folder ${folderName} `, service: 'removeFolder'})
  if (path === 'default') {
    const defaultInstallPath = (await GlobalConfig.get()).config.defaultInstallPath.replaceAll("'", '')
    const folderToDelete = `${defaultInstallPath}/${folderName}`
    return setTimeout(() => {
      rmdirSync(folderToDelete, {recursive: true})
    }, 2000)
  }

  const folderToDelete = `${path}/${folderName}`
  return setTimeout(() => {
    rmdirSync(folderToDelete, {recursive: true})
  }, 2000)
})

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
interface Tools {
  exe: string
  prefix: string
  tool: string
  wine: string
}

ipcMain.on('callTool', async (event, { tool, wine, prefix, exe }: Tools) => {
  Logger.info({message: `Attempting to run tool ${tool}`, service: 'callTool'})
  const wineBin = wine.replace("/proton'", "/dist/bin/wine'")
  let winePrefix: string = prefix.replace('~', home)

  if (wine.includes('proton')) {
    const protonPrefix = winePrefix.replaceAll("'", '')
    winePrefix = `'${protonPrefix}/pfx'`
  }

  let command = `WINE=${wineBin} WINEPREFIX=${winePrefix} 
    ${tool === 'winecfg' ? `${wineBin} ${tool}` : tool}`

  if (tool === 'runExe') {
    command = `WINEPREFIX=${winePrefix} ${wineBin} ${exe}`
  }

  console.log({ command })
  return exec(command)
})

/// IPC handlers begin here.

ipcMain.handle('checkGameUpdates', () => {Logger.info({message: 'Attempting to check for game updates ', service: 'checkGameUpdates'}); LegendaryGame.checkGameUpdates()})

ipcMain.handle('checkVersion', () => {Logger.info({message: 'Attempting to check heroic version ', service: 'checkVersion'}); checkForUpdates()})

ipcMain.handle('getMaxCpus', () => {Logger.info({message: 'Attempting to get max cpus ', service: 'getMaxCpus'}); cpus().length})

ipcMain.handle('getGameInfo', async (event, game) => {
  Logger.info({message: `Attempting to get game info for ${game} `, service: 'getGameInfo'})
  const obj = LegendaryGame.get(game)
  const info = await obj.getGameInfo()
  info.extra = await obj.getExtraInfo(info.namespace)
  return info
})

ipcMain.handle('getUserInfo', () => {Logger.info({message: 'Attempting to get user info ', service: 'getUserInfo'}); User.getUserInfo()})

// Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', () => {Logger.info({message: 'Attempting to check if user is logged in ', service: 'isLoggedIn'}); User.isLoggedIn()})

ipcMain.handle('login', async (event, sid) => {Logger.info({message: 'Attempting to log user in ', service: 'login'}); await User.login(sid)})

ipcMain.handle('logout', async () => {Logger.info({message: 'Attempting to logout user ', service: 'logout'}); await User.logout()})

ipcMain.handle('getAlternativeWine', () => {Logger.info({message: 'Attempting to get alternative wine(s) ', service: 'getAlternativeWine'}); GlobalConfig.get().getAlternativeWine()})

ipcMain.handle('readConfig', async (event, config_class) =>  {
  Logger.info({message: 'Attempting to read config for heroic ', service: 'readConfig'});
  switch (config_class) {
  case 'library':
    return await Library.get().getGames('info')
  case 'user':
    return User.getUserInfo().displayName
  default:
    //console.log(`Which idiot requested '${config_class}' using readConfig?`)
    Logger.warn({message: `Which idiot requested '${config_class}' using readConfig?`, service: 'readConfig'});
    return {}
  }
})

ipcMain.handle('requestSettings', async (event, appName) => {
  Logger.info({message: 'Attempting to request settings ', service: 'requestSettings'});
  if (appName === 'default') {
    return await GlobalConfig.get().config
  }
  // We can't use .config since apparently its not loaded fast enough.
  return await GameConfig.get(appName).getSettings()
})

ipcMain.handle('writeConfig', (event, [appName, config]) => {
  Logger.info({message: 'Attempting to write config ', service: 'writeConfig'});
  if (appName === 'default') {
    GlobalConfig.get().config = config
    GlobalConfig.get().flush()
  }
  else {
    GameConfig.get(appName).config = config
    GameConfig.get(appName).flush()
  }
})

ipcMain.handle('refreshLibrary', async () => {
  Logger.info({message: 'Attempting to refresh library ', service: 'refreshLibrary'});
  return await Library.get().refresh()
})

ipcMain.handle('launch', (event, game) => {
  Logger.info({message: `Attempting to launch game ${game} `, service: 'launch'});
  //console.log('launching', game)

  return LegendaryGame.get(game).launch().then(({ stderr }) => {
    writeFile(
      `${heroicGamesConfigPath}${game}-lastPlay.log`,
      stderr,
      () => 'done'
    )
    if (stderr.includes('Errno')) {
      Logger.error({message: `Error while launching  ${game}\n${stderr} `, service: 'launch'});
      showErrorBox(
        i18next.t('box.error', 'Something Went Wrong'),
        i18next.t(
          'box.error.launch',
          'Error when launching the game, check the logs!'
        )
      )
    }
  }).catch(async ({ stderr }) => {
    writeFile(
      `${heroicGamesConfigPath}${game}-lastPlay.log`,
      stderr,
      () => {Logger.error({message: `written lastplay log with ERROR\n${stderr} `, service: 'launch'}); 'done'}
    )
    return stderr
  })
})


ipcMain.handle('install', async (event, args) => {
  Logger.info({message: `Attempting to install game ${args.game}`, service: 'install'});
  const { appName: game, path } = args
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving up on installing game ${game}`, service: 'install'});
    console.log(`App offline, skipping install for game '${game}'.`)
    return
  }
  return LegendaryGame.get(game).install(path).then(
    () => { Logger.info({message: `Installed ${game}` , service: 'install'}); console.log('finished installing') }
  ).catch((res) => {Logger.error({message: `Failed to install game ${game} with:\n${res} `, service: 'install'}); res})
})

ipcMain.handle('uninstall', async (event, game) => {
  Logger.info({message: `Attempting to uninstall ${game}`, service: 'uninstall'});
  return LegendaryGame.get(game).uninstall().then(
    () => { Logger.info({message: `Finished uninstall ${game}`, service: 'uninstall'}); console.log('finished uninstalling') }
  ).catch((err) => {Logger.error({message: `Failed to uninstall ${game} with ERROR\n${err}`, service: 'uninstall'}); console.log(err)})
})

ipcMain.handle('repair', async (event, game) => {
  Logger.info({message: `Attempting to repair ${game}`, service: 'repair'});
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving up on repairing game ${game}`, service: 'repair'});
    console.log(`App offline, skipping repair for game '${game}'.`)
    return
  }
  return LegendaryGame.get(game).repair().then(
    () => {Logger.info({message: `Finished repairing ${game}`, service: 'repair'}); console.log('finished repairing')}
  ).catch((err) => {Logger.error({message: `Failed to repair game ${game} with ERROR\n${err}`, service: 'repair'}); console.log(err)})
})

ipcMain.handle('importGame', async (event, args) => {
  Logger.info({message: `Trying to import ${args.game}`, service: 'importGame'});
  const { appName: game, path } = args
  const {stderr, stdout} = await LegendaryGame.get(game).import(path)
  console.log(`${stdout} - ${stderr}`)
})

ipcMain.handle('updateGame', async (e, game) => {
  Logger.info({message: `Attempting to update ${game}`, service: 'updateGame'});
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving p on updating ${game}`, service: 'updateGame'});
    console.log(`App offline, skipping install for game '${game}'.`)
    return
  }
  return LegendaryGame.get(game).update().then(
    () => { Logger.info({message: `Finished updating ${game}`, service: 'updateGame'}); console.log('finished updating') }
  ).catch((res) => {Logger.error({message: `Failed to update ${game} with ERROR\n${res}`, service: 'updateGame'}); console.log(res)})
})

// TODO(adityaruplaha): Use UNIX sockets to refactor this.
ipcMain.handle('requestGameProgress', async (event, appName) => {
  Logger.info({message: `Trying to request game progress`, service: 'requestGameProgress'});
  const logPath = `"${heroicGamesConfigPath}${appName}.log"`
  const progress_command = `tail ${logPath} | grep 'Progress: ' | awk '{print $5, $11}' | tail -1`
  const downloaded_command = `tail ${logPath} | grep 'Downloaded: ' | awk '{print $5}' | tail -1`
  const { stdout: progress_result } = await execAsync(progress_command)
  const { stdout: downloaded_result } = await execAsync(downloaded_command)
  const [percent, eta] = progress_result.split(' ')
  const bytes = downloaded_result + 'MiB'

  const progress = { bytes, eta, percent }
  Logger.info({message: `Game progress: ${appName} ${progress.percent}/${progress.bytes}/${eta} `, service: 'requestGameProgress'});
  /*console.log(
    `Progress: ${appName} ${progress.percent}/${progress.bytes}/${eta}`
  )*/
  return progress
})

ipcMain.handle('moveInstall', async (event, [appName, path]: string[]) => {
  Logger.info({message: `Attempting to move install of ${appName} to ${path}`, service: 'moveInstall'});
  const newPath = await LegendaryGame.get(appName).moveInstall(path)
  Logger.info({message: `Moved ${appName} to ${newPath}`, service: 'moveInstall'});
  //console.log(`Finished moving ${appName} to ${newPath}.`)
})

ipcMain.handle('changeInstallPath', async (event, [appName, newPath]: string[]) => {
  Logger.info({message: `Trying to change install path of ${appName} to ${newPath}`, service: 'changeInstallPath'});
  Library.get().changeGameInstallPath(appName, newPath)
  Logger.info({message: `Finished moving ${appName} to ${newPath}`, service: 'changeInstallPath'});
  //console.log(`Finished moving ${appName} to ${newPath}.`)
})

ipcMain.handle('egsSync', async (event, args) => {
  Logger.info({message: `Attempting to sync with epic games`, service: 'egsSync'});
  const linkArgs = `--enable-sync --egl-wine-prefix ${args}`
  const unlinkArgs = `--unlink`
  const isLink = args !== 'unlink'
  const command = isLink ? linkArgs : unlinkArgs

  try {
    const { stderr, stdout } = await execAsync(
      `${legendaryBin} egl-sync ${command} -y`
    )
    console.log(`${stdout} - ${stderr}`)
    return `${stdout} - ${stderr}`
  } catch (error) {
    Logger.error({message: `Failed to sync with epic with ERROR\n${error}`, service: 'egsSync'});
    return 'Error'
  }
})

ipcMain.handle('syncSaves', async (event, args) => {
  Logger.info({message: `Attempting to sync saves for ${args.sync}`, service: 'syncSaves'});
  const [arg = '', path, appName] = args
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving up on syncing saves for ${appName}`, service: 'syncSaves'});
    //console.log(`App offline, skipping syncing saves for game '${appName}'.`)
    return
  }

  const { stderr, stdout } = await LegendaryGame.get(appName).syncSaves(arg, path)
  console.log(`${stdout} - ${stderr}`)
  return `\n ${stdout} - ${stderr}`
})
