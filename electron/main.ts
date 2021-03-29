import * as path from 'path'

import {
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  app,
  ipcMain,
  powerSaveBlocker
} from 'electron'
import {
  cpus,
  userInfo as user
} from 'os'
import {
  exec,
  spawn
} from 'child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFile,
  writeFileSync
} from 'graceful-fs'

import Backend from 'i18next-fs-backend'
import i18next from 'i18next'
import isDev from 'electron-is-dev'

import { DXVK } from './dxvk'
import { LegendaryGame } from './games'
import { RawGameJSON } from './types.js'
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
  heroicConfigPath,
  heroicGamesConfigPath,
  heroicGithubURL,
  home,
  iconDark,
  iconLight,
  installed,
  legendaryBin,
  loginUrl,
  sidInfoUrl,
  supportURL,
  userInfo
} from './constants'
import {
  getAlternativeWine,
  getSettings,
  isLoggedIn,
  writeGameConfig
} from './config'
import { getLegendaryConfig } from './legendary_utils/legacy_library'

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

  //load the index.html from a url
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
    /* eslint-enable @typescript-eslint/ban-ts-comment */

    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = await getSettings('default')

      if (exitToTray) {
        return mainWindow.hide()
      }

      return await handleExit()
    })
  } else {
    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = await getSettings('default')

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
      label: 'Github'
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
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      mainWindow.show()
    }
  })
  app.whenReady().then(async () => {
    const { language, darkTrayIcon } = await getSettings('default')

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
        'hu'
      ]
    })

    createWindow()

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
  const notify = new Notification({
    body: args[1],
    title: args[0]
  })

  notify.on('click', () => mainWindow.show())
  notify.show()
})

ipcMain.on('openSupportPage', () => openUrlOrFile(supportURL))

ipcMain.handle('checkGameUpdates', () => LegendaryGame.checkGameUpdates())

ipcMain.on('openReleases', () => openUrlOrFile(heroicGithubURL))

ipcMain.handle('checkVersion', () => checkForUpdates())

ipcMain.handle('writeFile', (event, args) => {
  const app = args[0]
  const config = args[1]
  if (app === 'default') {
    return writeFile(
      heroicConfigPath,
      JSON.stringify(config, null, 2),
      () => 'done'
    )
  }
  return writeFile(
    `${heroicGamesConfigPath}/${app}.json`,
    JSON.stringify(config, null, 2),
    () => 'done'
  )
})

let powerId: number | null
ipcMain.on('lock', () => {
  if (!existsSync(`${heroicGamesConfigPath}/lock`)) {
    writeFile(`${heroicGamesConfigPath}/lock`, '', () => 'done')
    if (!powerId) {
      powerId = powerSaveBlocker.start('prevent-app-suspension')
    }
  }
})

ipcMain.on('unlock', () => {
  if (existsSync(`${heroicGamesConfigPath}/lock`)) {
    unlinkSync(`${heroicGamesConfigPath}/lock`)
    if (powerId) {
      powerSaveBlocker.stop(powerId)
    }
  }
})

ipcMain.handle('getMaxCpus', () => cpus().length)

ipcMain.on('quit', async () => handleExit())

ipcMain.handle('getGameInfo', (event, game, namespace: string | null) => {
  return LegendaryGame.get(game).getExtraInfo(namespace)
})

ipcMain.handle('launch', (event, game) => {
  console.log('launching', game)

  return LegendaryGame.get(game).launch().then(({ stderr }) => {
    writeFile(
      `${heroicGamesConfigPath}${game}-lastPlay.log`,
      stderr,
      () => 'done'
    )
    if (stderr.includes('Errno')) {
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
      () => 'done'
    )
    return stderr
  })
})

ipcMain.handle('legendary', async (event, args) => {
  const command = `${legendaryBin} ${args}`
  return await execAsync(command)
    .then(({ stdout, stderr }) => {
      if (stdout) {
        return stdout
      } else if (stderr) {
        return stderr
      } else {
        return 'done'
      }
    })
    .catch((err) => console.log(err))
})

ipcMain.handle('install', async (event, args) => {
  const { appName: game, path } = args
  if (!(await isOnline())) {
    console.log(`App offline, skipping install for game '${game}'.`)
    return
  }
  return LegendaryGame.get(game).install(path).then(
    () => { console.log('finished installing') }
  ).catch((res) => res)
})

ipcMain.handle('repair', async (event, game) => {
  if (!(await isOnline())) {
    console.log(`App offline, skipping repair for game '${game}'.`)
    return
  }
  return LegendaryGame.get(game).repair().then(
    () => console.log('finished repairing')
  ).catch(console.log)
})

ipcMain.handle('importGame', async (event, args) => {
  const { appName: game, path } = args
  const {stderr, stdout} = await LegendaryGame.get(game).import(path)
  console.log(`${stdout} - ${stderr}`)
})

ipcMain.handle('updateGame', async (e, game) => {
  if (!(await isOnline())) {
    console.log(`App offline, skipping install for game '${game}'.`)
    return
  }
  return LegendaryGame.get(game).update().then(
    () => { console.log('finished updating') }
  ).catch((res) => res)
})

// @@refactor
ipcMain.handle('requestGameProgress', async (event, appName) => {
  const logPath = `"${heroicGamesConfigPath}${appName}.log"`
  const progress_command = `tail ${logPath} | grep 'Progress: ' | awk '{print $5, $11}' | tail -1`
  const downloaded_command = `tail ${logPath} | grep 'Downloaded: ' | awk '{print $5}' | tail -1`
  const { stdout: progress_result } = await execAsync(progress_command)
  const { stdout: downloaded_result } = await execAsync(downloaded_command)
  const [percent, eta] = progress_result.split(' ')
  const bytes = downloaded_result + 'MiB'

  const progress = { bytes, eta, percent }
  console.log(
    `Progress: ${appName} ${progress.percent}/${progress.bytes}/${eta}`
  )
  return progress
})

ipcMain.on('kill', (event, game) => {
  // until the legendary bug gets fixed, kill legendary on mac
  // not a perfect solution but it's the only choice for now
  game = process.platform === 'darwin' ? 'legendary' : game
  console.log('killing', game)
  return spawn('pkill', ['-f', game])
})

ipcMain.on('openFolder', (event, folder) => openUrlOrFile(folder))

ipcMain.handle('getAlternativeWine', () => getAlternativeWine())

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
interface Tools {
  exe: string
  prefix: string
  tool: string
  wine: string
}

ipcMain.on('callTool', async (event, { tool, wine, prefix, exe }: Tools) => {
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

ipcMain.handle('requestSettings', async (event, appName) => {
  if (appName === 'default') {
    return await getSettings('default')
  }

  if (appName !== 'default') {
    writeGameConfig(appName)
  }

  return await getSettings(appName)
})

//Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', () => isLoggedIn())

ipcMain.on('openLoginPage', () => openUrlOrFile(loginUrl))

ipcMain.on('openDiscordLink', () => openUrlOrFile(discordLink))

ipcMain.on('openSidInfoPage', () => openUrlOrFile(sidInfoUrl))

ipcMain.on('getLog', (event, appName) =>
  openUrlOrFile(`"${heroicGamesConfigPath}/${appName}-lastPlay.log"`)
)


// @@refactor
ipcMain.handle('moveInstall', async (event, [appName, path]: string[]) => {
  const file = JSON.parse(readFileSync(installed, 'utf8'))
  const installedGames: RawGameJSON[] = Object.values(file)
  const { install_path } = installedGames.filter(
    (game) => game.app_name === appName
  )[0]

  const splitPath = install_path.split('/')
  const installFolder = splitPath[splitPath.length - 1]
  const newPath = `${path}/${installFolder}`
  const game: RawGameJSON = { ...file[appName], install_path: newPath }
  const modifiedInstall = { ...file, [appName]: game }
  return await execAsync(`mv -f ${install_path} ${newPath}`)
    .then(() => {
      writeFile(installed, JSON.stringify(modifiedInstall, null, 2), () =>
        console.log(`Finished moving ${appName} to ${newPath}`)
      )
    })
    .catch(console.log)
})

// @@refactor
ipcMain.handle(
  'changeInstallPath',
  async (event, [appName, newPath]: string[]) => {
    const file = JSON.parse(readFileSync(installed, 'utf8'))
    const game: RawGameJSON = { ...file[appName], install_path: newPath }
    const modifiedInstall = { ...file, [appName]: game }
    writeFileSync(installed, JSON.stringify(modifiedInstall, null, 2))
    console.log(`Finished moving ${appName} to ${newPath}`)
  }
)

ipcMain.handle('readConfig', async (event, config_class) =>
  getLegendaryConfig(config_class)
)

ipcMain.handle('egsSync', async (event, args) => {
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
    return 'Error'
  }
})

ipcMain.handle('getUserInfo', () => {
  const { account_id } = JSON.parse(readFileSync(userInfo, 'utf-8'))
  return { epicId: account_id, user: user().username }
})

ipcMain.on('removeFolder', async (e, args: string[]) => {
  const [path, folderName] = args

  if (path === 'default') {
    const defaultInstallPath = await (
      await getSettings('default')
    ).defaultInstallPath.replaceAll("'", '')
    const folderToDelete = `${defaultInstallPath}/${folderName}`
    return setTimeout(() => {
      exec(`rm -Rf ${folderToDelete}`)
    }, 2000)
  }

  const folderToDelete = `${path}/${folderName}`
  return setTimeout(() => {
    exec(`rm -Rf ${folderToDelete}`)
  }, 2000)
})

ipcMain.handle('syncSaves', async (event, args) => {
  const [arg = '', path, appName] = args
  if (!(await isOnline())) {
    console.log(`App offline, skipping syncing saves for game '${appName}'.`)
    return
  }

  const fixedPath = path.replaceAll("'", '')
  const command = `${legendaryBin} sync-saves --save-path "${fixedPath}" ${arg} ${appName} -y`
  const legendarySavesPath = `${home}/legendary/.saves`

  //workaround error when no .saves folder exists
  if (!existsSync(legendarySavesPath)) {
    mkdirSync(legendarySavesPath, { recursive: true })
  }

  console.log('\n syncing saves for ', appName)
  const { stderr, stdout } = await execAsync(command)
  console.log(`${stdout} - ${stderr}`)
  return `\n ${stdout} - ${stderr}`
})

ipcMain.on('showAboutWindow', () => showAboutWindow())

// Maybe this can help with white screens
process.on('uncaughtException', (err) => {
  console.log(err)
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
