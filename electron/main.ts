import * as path from 'path'
import { Logger } from './logger'

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
import {
  cpus,
  platform
} from 'os'
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
import { Game } from './games'
import { GameConfig } from './game_config'
import { GlobalConfig } from './config'
import { LegendaryLibrary } from './legendary/library'
import { LegendaryUser } from './legendary/user';
import {
  checkForUpdates,
  errorHandler,
  execAsync,
  handleExit,
  isOnline,
  openUrlOrFile,
  semverGt,
  showAboutWindow
} from './utils'
import {
  discordLink,
  getShell,
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

const { showErrorBox, showMessageBox,showOpenDialog } = dialog
const isWindows = platform() === 'win32'

let mainWindow: BrowserWindow = null

function createWindow(): BrowserWindow {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: isDev ? 1200 : 720,
    minHeight: 700,
    minWidth: 1200,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    },
    width: isDev ? 1800 : 1280
  })

  setTimeout(() => {
    if (process.platform === 'linux') {
      DXVK.getLatest()
    }
  }, 2500)

  GlobalConfig.get()
  LegendaryLibrary.get()

  if (isDev) {
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    //@ts-ignore
    import('electron-devtools-installer').then((devtools) => {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = devtools
      installExtension(REACT_DEVELOPER_TOOLS).catch((err: string) => {
        Logger.error({message: `An error has occurred:\n${err}`, service: 'electron::devtools'})
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
        'cs',
        'de',
        'el',
        'en',
        'es',
        'fr',
        'hu',
        'it',
        'ml',
        'nl',
        'pl',
        'pt',
        'ru',
        'sv',
        'tr'
      ]
    })

    createWindow()

    protocol.registerStringProtocol('heroic', (request, callback) => {
      handleProtocol(mainWindow, request.url)
      callback('Operation initiated.')
    })
    if (!app.isDefaultProtocolClient('heroic')) {
      if (app.setAsDefaultProtocolClient('heroic')) {
        Logger.info({message: 'Registered protocol with OS', service: 'ipcMain::registerHeroicProtocol'})
      } else {
        Logger.error({message: 'Failed to register protocol with OS', service: 'ipcMain::registerHeroicProtocol'})
      }
    } else {
      Logger.info({message: 'Protocol already registered with OS', service: 'ipcMain::registerHeroicProtocol'})
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

    if (process.platform === 'linux'){
      let pythonFound = false
      for (const python of ['python', 'python3']) {
        const { stdout } = await execAsync(python + ' --version')
        const pythonVersion: string | null = stdout.includes('Python ') ? stdout.replace('\n', '').split(' ')[1] : null
        if (!pythonVersion) {
          console.log(`Python '${python}' not found.`);
          continue
        } else {
          console.log(`Python '${python}' found. Version: '${pythonVersion}'`)
          pythonFound ||= semverGt(pythonVersion, '3.8.0') || pythonVersion === '3.8.0'
        }
      }
      if (!pythonFound) {
        dialog.showErrorBox('Python Error', `${i18next.t('box.error.python', 'Heroic requires Python 3.8 or newer.')}`)
      }
    }

    return
  })
}

ipcMain.on('Notify', (event, args) => {
  Logger.info({message: 'Attempting to notify user ', service: 'ipcMain::Notify'})
  const notify = new Notification({
    body: args[1],
    title: args[0]
  })

  notify.on('click', () => mainWindow.show())
  notify.show()
})

let powerId: number | null
ipcMain.on('lock', () => {
  Logger.info({message: 'Attempting to lock ', service: 'ipcMain::lock'})
  if (!existsSync(`${heroicGamesConfigPath}/lock`)) {
    writeFile(`${heroicGamesConfigPath}/lock`, '', () => 'done')
    if (!powerId) {
      powerId = powerSaveBlocker.start('prevent-app-suspension')
      return powerId
    }
  }
})

ipcMain.on('unlock', () => {
  Logger.info({message: 'Attempting to unlock ', service: 'ipcMain::unlock'})
  if (existsSync(`${heroicGamesConfigPath}/lock`)) {
    unlinkSync(`${heroicGamesConfigPath}/lock`)
    if (powerId) {
      return powerSaveBlocker.stop(powerId)
    }
  }
})

ipcMain.on('kill', async (event, appName) => {
  Logger.info({message: `Attempting to kill game ${appName} `, service: 'ipcMain::kill'})
  return await Game.get(appName).stop()
})

ipcMain.on('quit', async () => {Logger.info({message: 'Attempting to run quit ', service: 'ipcMain::quit'}); handleExit();})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('open-url', (event, url) => {
  Logger.info({message: `Attempting to run open url ${url} `, service: 'ipcMain::openUrl'})
  event.preventDefault()
  handleProtocol(mainWindow, url)
})

ipcMain.on('openFolder', (event, folder) => {Logger.info({message: `Attempting to open folder ${folder}`, service: 'ipcMain::openFolder'}); openUrlOrFile(folder)})
ipcMain.on('openSupportPage', () => {Logger.info({message: 'Attempting to run open support page: ', service: 'ipcMain::openSupportPage'}); openUrlOrFile(supportURL)})
ipcMain.on('openReleases', () => {Logger.info({message: 'Attempting to show releases ', service: 'ipcMain::openReleases'}); openUrlOrFile(heroicGithubURL)})
ipcMain.on('showAboutWindow', () => {Logger.info({message: 'Attempting to show about window ', service: 'ipcMain::showAboutWindow'}); showAboutWindow()})
ipcMain.on('openLoginPage', () => {Logger.info({message: 'Attempting to open login page ', service: 'ipcMain::openLoginPage'}); openUrlOrFile(loginUrl)})
ipcMain.on('openDiscordLink', () => {Logger.info({message: 'Attempting to open discord link ', service: 'ipcMain::openDiscordLink'}); openUrlOrFile(discordLink)})
ipcMain.on('openSidInfoPage', () => {Logger.info({message: 'Attempting to open sid info page ', service: 'ipcMain::openSidInfoPage'}); openUrlOrFile(sidInfoUrl)})

ipcMain.on('getLog', (event, appName) => {
  Logger.info({message: `Attempting to get wine log for ${appName}`, service: 'ipcMain::getLog'})
  openUrlOrFile(`"${heroicGamesConfigPath}/${appName}-lastPlay.log"`)
})

ipcMain.on('removeFolder', async (e, [path, folderName]) => {
  Logger.info({message: `Attempting to remove folder ${folderName} `, service: 'ipcMain::removeFolder'})
  if (path === 'default') {
    const defaultInstallPath = (await GlobalConfig.get()).config.defaultInstallPath.replaceAll("'", '')
    const folderToDelete = `${defaultInstallPath}/${folderName}`
    return setTimeout(() => {
      rmdirSync(folderToDelete, {recursive: true})
    }, 2000)
  }

  const folderToDelete = `${path}/${folderName}`.replaceAll("'", '')
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
  Logger.info({message: `Attempting to run tool ${tool}`, service: 'ipcMain::callTool'})
  const wineBin = wine.replace("/proton'", "/dist/bin/wine'")
  let winePrefix: string = prefix.replace('~', home)

  if (wine.includes('proton')) {
    const protonPrefix = winePrefix.replaceAll("'", '')
    winePrefix = `${protonPrefix}/pfx`
  }

  let command = `WINE=${wineBin} WINEPREFIX='${winePrefix}' ${tool === 'winecfg' ? `${wineBin} ${tool}` : tool}`

  if (tool === 'runExe') {
    command = `WINEPREFIX='${winePrefix}' ${wineBin} '${exe}'`
  }

  Logger.info({message: `Trying to run command ${command}`, service: 'ipcMain::callTool'})
  return await execAsync(command)
})

/// IPC handlers begin here.

ipcMain.handle('checkGameUpdates', () => {Logger.info({message: 'Attempting to check for game updates ', service: 'ipcMain::checkGameUpdates'}); return LegendaryLibrary.get().listUpdateableGames()})
// Not ready to be used safely yet.
ipcMain.handle('updateAll', () => {Logger.info({message: 'Attempting to update all games ', service:'Game::updateAllGames'}); return LegendaryLibrary.get().updateAllGames()})

ipcMain.handle('checkVersion', () => {Logger.info({message: 'Attempting to check heroic version ', service: 'ipcMain::checkVersion'}); return checkForUpdates()})

ipcMain.handle('getMaxCpus', () => {Logger.info({message: 'Attempting to get max cpus ', service: 'ipcMain::getMaxCpus'}); return cpus().length})
ipcMain.handle('getPlatform', () => {Logger.info({message: `Attempting to get platform  (got ${process.platform})`, service: 'ipcMain::getPlatform'}); return process.platform})

ipcMain.on('createNewWindow', (e, url) =>{
  Logger.info({message: `Attempting to create new browser window, with url ${url} `, service: 'ipcMain::createNewWindow'})
  return new BrowserWindow({ height: 700, width: 1200 }).loadURL(url)
})

ipcMain.handle('getGameInfo', async (event, appName) => {
  Logger.info({message: `Attempting to get game info for ${appName} `, service: 'ipcMain::getGameInfo'})
  const obj = Game.get(appName)
  const info = await obj.getGameInfo()
  info.extra = await obj.getExtraInfo(info.namespace)
  return info
})

ipcMain.handle('getUserInfo', async () => {Logger.info({message: 'Attempting to get user info ', service: 'ipcMain::getUserInfo'}); return await LegendaryUser.getUserInfo()})

// Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', async () => {Logger.info({message: 'Attempting to check if user is logged in ', service: 'ipcMain::isLoggedIn'}); return await LegendaryUser.isLoggedIn()})

ipcMain.handle('login', async (event, sid) => {Logger.info({message: 'Attempting to log user in ', service: 'ipcMain::login'}); return await LegendaryUser.login(sid)})

ipcMain.handle('logout', async () => {Logger.info({message: 'Attempting to logout user ', service: 'ipcMain::logout'}); return await LegendaryUser.logout()})

ipcMain.handle('getAlternativeWine', () => {Logger.info({message: 'Attempting to get alternative wine(s) ', service: 'ipcMain::getAlternativeWine'}); return GlobalConfig.get().getAlternativeWine()})

ipcMain.handle('readConfig', async (event, config_class) =>  {
  Logger.info({message: 'Attempting to read config for heroic ', service: 'ipcMain::readConfig'});
  switch (config_class) {
  case 'library':
    return await LegendaryLibrary.get().getGames('info')
  case 'user':
    return (await LegendaryUser.getUserInfo()).displayName
  default:
    Logger.warn({message: `Which idiot requested '${config_class}' using readConfig?`, service: 'ipcMain::readConfig'});
    return {}
  }
})

ipcMain.handle('requestSettings', async (event, appName) => {
  Logger.info({message: 'Attempting to request settings ', service: 'ipcMain::requestSettings'});
  if (appName === 'default') {
    return GlobalConfig.get().config
  }
  // We can't use .config since apparently its not loaded fast enough.
  return await GameConfig.get(appName).getSettings()
})

ipcMain.handle('writeConfig', (event, [appName, config]) => {
  Logger.info({message: 'Attempting to write config ', service: 'ipcMain::writeConfig'});
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
  Logger.info({message: 'Attempting to refresh library ', service: 'ipcMain::refreshLibrary'});
  return await LegendaryLibrary.get().refresh()
})

ipcMain.handle('launch', (event, appName) => {
  Logger.info({message: `Attempting to launch game ${appName} `, service: 'Game::launch'});
  return Game.get(appName).launch().then(({ stderr }) => {
    writeFile(
      `${heroicGamesConfigPath}${appName}-lastPlay.log`,
      stderr,
      () => 'done'
    )
    if (stderr.includes('Errno')) {
      Logger.error({message: `Error while launching  ${appName}\n${stderr} `, service: 'Game::launch'});
      showErrorBox(
        i18next.t('box.error', 'Something Went Wrong'),
        i18next.t(
          'box.error.launch',
          'Error when launching the game, check the logs!'
        )
      )
    }
  }).catch(async (exception) => {
    // This stuff is completely borken, I have no idea what the hell we should do here.
    const stderr = `${exception.name} - ${exception.message}`
    errorHandler({error: {stderr, stdout: ''}})
    writeFile(
      `${heroicGamesConfigPath}${appName}-lastPlay.log`,
      stderr,
      () => {Logger.error({message: `written lastPlay log with ERROR\n${stderr} `, service: 'Game::launch'}); 'done'}
    )
    return stderr
  })
})

ipcMain.handle('openDialog', async (e, args) => {
  const { filePaths, canceled } = await showOpenDialog({
    ...args
  })
  if (filePaths[0]){
    return { path: filePaths[0]}
  }
  return {canceled}
})

ipcMain.handle('openMessageBox', async (e, args) => {
  const { response } = await showMessageBox({...args})
  return {response}
})


ipcMain.handle('install', async (event, args) => {
  Logger.info({message: `Attempting to install game ${args.game}`, service: 'Game::install'});
  const { appName: game, path } = args
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving up on installing game ${game}`, service: 'Game::install'});
    return
  }
  return Game.get(game).install(path).then(
    () => Logger.info({message: `Installed ${game}` , service: 'Game::install'})
  ).catch((res) => {Logger.error({message: `Failed to install game ${game} with:\n${res} `, service: 'Game::install'}); return res})
})

ipcMain.handle('uninstall', async (event, appName) => {
  Logger.info({message: `Attempting to uninstall ${appName}`, service: 'Game::uninstall'});
  return Game.get(appName).uninstall().then(
    () => Logger.info({message: `Finished uninstall ${appName}`, service: 'Game::uninstall'})
  ).catch((err) => Logger.error({message: `Failed to uninstall ${appName} with ERROR\n${err}`, service: 'Game::uninstall'}))
})

ipcMain.handle('repair', async (event, appName) => {
  Logger.info({message: `Attempting to repair ${appName}`, service: 'Game::repair'});
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving up on repairing game ${appName}`, service: 'Game::repair'});
    return
  }
  return Game.get(appName).repair().then(
    () => {Logger.info({message: `Finished repairing ${appName}`, service: 'Game::repair'});}
  ).catch((err) => Logger.error({message: `Failed to repair game ${appName} with ERROR\n${err}`, service: 'Game::repair'}) )
})

ipcMain.handle('importGame', async (event, args) => {
  Logger.info({message: `Trying to import ${args.game}`, service: 'Game::importGame'});
  const { appName: game, path } = args
  const {stderr, stdout} = await Game.get(game).import(path)
  Logger.info({message: `${stdout} - ${stderr}`, service: 'Game::importGame' })
})

ipcMain.handle('updateGame', async (e, appName) => {
  Logger.info({message: `Attempting to update ${appName}`, service: 'Game::updateGame'});
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving up on updating ${appName}`, service: 'Game::updateGame'})
    return
  }
  return Game.get(appName).update().then(
    () => Logger.info({message: `Finished updating ${appName}`, service: 'Game::updateGame'})
  ).catch((res) => Logger.error({message: `Failed to update ${appName} with ERROR\n${res}`, service: 'Game::updateGame'}))
})

// TODO(adityaruplaha): Use UNIX sockets to refactor this.
ipcMain.handle('requestGameProgress', async (event, appName) => {
  Logger.info({message: `Trying to request game progress`, service: 'Game::requestGameProgress'});
  const logPath = `${heroicGamesConfigPath}${appName}.log`

  if(!existsSync(logPath)){
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
    [percent, eta] = progress_result.split(' ')
    bytes = downloaded_result + 'MiB'
  }

  const progress = { bytes, eta, percent }
  console.log(
    `Progress: ${appName} ${progress.percent}/${progress.bytes}/${eta}`
  )
  return progress
})

ipcMain.handle('moveInstall', async (event, [appName, path]: string[]) => {
  Logger.info({message: `Attempting to move install of ${appName} to ${path}`, service: 'Game::moveInstall'});
  const newPath = await Game.get(appName).moveInstall(path)
  Logger.info({message: `Moved ${appName} to ${newPath}`, service: 'Game::moveInstall'});
})

ipcMain.handle('changeInstallPath', async (event, [appName, newPath]: string[]) => {
  Logger.info({message: `Trying to change install path of ${appName} to ${newPath}`, service: 'Game::changeInstallPath'});
  LegendaryLibrary.get().changeGameInstallPath(appName, newPath)
  Logger.info({message: `Finished moving ${appName} to ${newPath}`, service: 'Game::changeInstallPath'});
})

ipcMain.handle('egsSync', async (event, args) => {
  Logger.info({message: `Attempting to sync with epic games`, service: 'ipcMain::egsSync'});
  const linkArgs = `--enable-sync --egl-wine-prefix ${args}`
  const unlinkArgs = `--unlink`
  const isLink = args !== 'unlink'
  const command = isLink ? linkArgs : unlinkArgs

  try {
    const { stderr, stdout } = await execAsync(
      `${legendaryBin} egl-sync ${command} -y`
    )
    Logger.info({message: `${stdout} - ${stderr}`, service: 'ipcMain::egsSync'})
    return `${stdout} - ${stderr}`
  } catch (error) {
    Logger.error({message: `Failed to sync with epic with ERROR\n${error}`, service: 'ipcMain::egsSync'});
    return 'Error'
  }
})

ipcMain.handle('syncSaves', async (event, args) => {
  Logger.info({message: `Attempting to sync saves for ${args.sync}`, service: 'Game::syncSaves'});
  const [arg = '', path, appName] = args
  if (!(await isOnline())) {
    Logger.info({message: `App offline, giving up on syncing saves for ${appName}`, service: 'Game::syncSaves'});
    return
  }
  const { stderr, stdout } = await Game.get(appName).syncSaves(arg, path)
  Logger.info({message: `${stdout} - ${stderr}`, service: 'Game::syncSaves'})
  return `\n ${stdout} - ${stderr}`
})
