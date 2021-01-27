/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  heroicConfigPath,
  heroicGamesConfigPath,
  launchGame,
  legendaryBin,
  loginUrl,
  getAlternativeWine,
  isLoggedIn,
  legendaryConfigPath,
  userInfo,
  writeDefaultconfig,
  writeGameconfig,
  getLatestDxvk,
  home,
  sidInfoUrl,
  updateGame,
  checkForUpdates,
  showAboutWindow,
  kofiURL,
  handleExit,
  heroicGithubURL,
  iconDark,
  iconLight,
} from './utils'

import byteSize from 'byte-size'
import { spawn, exec } from 'child_process'
import * as path from 'path'
import isDev from 'electron-is-dev'
import {
  stat,
  readFileSync,
  readdirSync,
  writeFile,
  existsSync,
  mkdirSync,
  unlinkSync,
} from 'fs'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)
const statAsync = promisify(stat)

import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  Menu,
  Tray,
  nativeTheme,
  dialog,
  powerSaveBlocker,
} from 'electron'
import { AppSettings, Game, InstalledInfo, KeyImage } from './types.js'

const { showMessageBox, showErrorBox } = dialog
let mainWindow: BrowserWindow = null

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: isDev ? 1800 : 1280,
    height: isDev ? 1200 : 720,
    minHeight: 600,
    minWidth: 1280,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  })

  writeDefaultconfig()
  getLatestDxvk()

  setTimeout(() => {
    checkForUpdates()
  }, 3500)

  //load the index.html from a url
  if (isDev) {
    import('electron-devtools-installer').then((devtools) => {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = devtools

      installExtension(REACT_DEVELOPER_TOOLS).catch((err: any) => {
        console.log('An error occurred: ', err)
      })
    })
    mainWindow.loadURL('http://localhost:3000')
    // Open the DevTools.
    mainWindow.webContents.openDevTools()
    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = JSON.parse(
        // @ts-ignore
        readFileSync(heroicConfigPath)
      ).defaultSettings as AppSettings

      if (exitToTray) {
        return mainWindow.hide()
      }
      return handleExit()
    })
  } else {
    mainWindow.on('close', async (e) => {
      e.preventDefault()
      const { exitToTray } = JSON.parse(
        // @ts-ignore
        readFileSync(heroicConfigPath)
      ).defaultSettings as AppSettings

      if (exitToTray) {
        return mainWindow.hide()
      }
      return handleExit()
    })
    mainWindow.loadURL(`file://${path.join(__dirname, '../build/index.html')}`)
    mainWindow.setMenu(null)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let appIcon: Tray = null
let window = null
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (window) {
      if (window.isMinimized()) {
        window.restore()
        window.focus()
      }
    }
  })
  app.whenReady().then(() => {
    window = createWindow()
    const trayIcon = nativeTheme.shouldUseDarkColors ? iconDark : iconLight
    appIcon = new Tray(trayIcon)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Heroic',
        click: function () {
          mainWindow.show()
        },
      },
      {
        label: 'About',
        click: function () {
          showAboutWindow()
        },
      },
      {
        label: 'Github',
        click: function () {
          exec(`xdg-open ${heroicGithubURL}`)
        },
      },
      {
        label: 'Support Us',
        click: function () {
          exec(`xdg-open ${kofiURL}`)
        },
      },
      {
        label: 'Quit',
        click: function () {
          handleExit()
        },
      },
    ])

    appIcon.setContextMenu(contextMenu)
    appIcon.setToolTip('Heroic')
    return
  })
}

ipcMain.on('Notify', (event, args) => {
  const notify = new Notification({
    title: args[0],
    body: args[1],
  })

  notify.on('click', () => mainWindow.show())
  notify.show()
})

ipcMain.on('openSupportPage', () => exec(`xdg-open ${kofiURL}`))

ipcMain.handle('writeFile', (event, args) => {
  const app = args[0]
  const config = args[1]
  if (args[0] === 'default') {
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

let powerId = null
ipcMain.on('lock', () => {
  writeFile(`${heroicGamesConfigPath}/lock`, '', () => 'done')
  powerId = powerSaveBlocker.start('prevent-app-suspension')
})

ipcMain.on('unlock', () => {
  if (existsSync(`${heroicGamesConfigPath}/lock`)) {
    unlinkSync(`${heroicGamesConfigPath}/lock`)
    powerSaveBlocker.stop(powerId)
  }
})

ipcMain.on('quit', () => handleExit())

ipcMain.handle('getGameInfo', async (event, game) => {
  const epicUrl = `https://store-content.ak.epicgames.com/api/en-US/content/products/${game}`
  try {
    const response = await axios({
      url: epicUrl,
      method: 'GET',
    })
    return response.data.pages[0].data.about
  } catch (error) {
    return {}
  }
})

ipcMain.handle('launch', (event, appName) => {
  console.log('launching', appName)

  return launchGame(appName).catch(console.log)
})

ipcMain.handle('legendary', async (event, args) => {
  const isUninstall = args.startsWith('uninstall')

  if (isUninstall) {
    const { response } = await showMessageBox({
      type: 'warning',
      title: 'Uninstall',
      message: 'Do you want to Uninstall this game?',
      buttons: ['Yes', 'No'],
    })
    if (response === 1) {
      return response
    }
    if (response === 0) {
      return execAsync(`${legendaryBin} ${args} -y`)
    }
  } else {
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
  }
})

ipcMain.handle('install', async (event, args) => {
  const { appName: game, path } = args
  const logPath = `${heroicGamesConfigPath}${game}.log`
  let command = `${legendaryBin} install ${game} --base-path '${path}' -y &> ${logPath}`
  if (path === 'default') {
    const { defaultInstallPath } = JSON.parse(
      // @ts-ignore
      readFileSync(heroicConfigPath)
    ).defaultSettings
    command = `${legendaryBin} install ${game} --base-path ${defaultInstallPath} -y |& tee ${logPath}`
  }
  console.log(`Installing ${game} with:`, command)
  await execAsync(command, { shell: '/bin/bash' })
    .then(console.log)
    .catch(console.log)
})

ipcMain.handle('repair', async (event, game) => {
  const logPath = `${heroicGamesConfigPath}${game}.log`
  const command = `${legendaryBin} repair ${game} -y &> ${logPath}`

  console.log(`Repairing ${game} with:`, command)
  await execAsync(command, { shell: '/bin/bash' })
    .then(console.log)
    .catch(console.log)
})

ipcMain.handle('importGame', async (event, args) => {
  const { appName: game, path } = args
  const command = `${legendaryBin} import-game ${game} '${path}'`
  const { stderr, stdout } = await execAsync(command, { shell: '/bin/bash' })
  console.log(`${stdout} - ${stderr}`)
  return
})

ipcMain.handle('updateGame', (e, appName) => updateGame(appName))

ipcMain.on('requestGameProgress', (event, appName) => {
  const logPath = `${heroicGamesConfigPath}${appName}.log`
  exec(
    `tail ${logPath} | grep 'Progress: ' | awk '{print $5 $6 $11}'`,
    (error, stdout) => {
      const status = `${stdout.split('\n')[0]}`.split('(')
      const percent = status[0]
      const eta = status[1] ? status[1].split(',')[1] : ''
      const bytes = status[1] ? status[1].split(',')[0].replace(')', 'MB') : ''
      const progress = { percent, bytes, eta }
      console.log(
        `Progress: ${appName} ${progress.percent}/${progress.bytes}/${eta}`
      )
      event.reply(`${appName}-progress`, progress)
    }
  )
})

ipcMain.on('kill', (event, game) => {
  console.log('killing', game)
  return spawn('pkill', ['-f', game])
})

ipcMain.on('openFolder', (event, folder) => spawn('xdg-open', [folder]))

ipcMain.on('getAlternativeWine', (event) =>
  event.reply('alternativeWine', getAlternativeWine())
)

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
interface Tools {
  tool: string
  wine: string
  prefix: string
  exe: string
}

ipcMain.on('callTool', async (event, { tool, wine, prefix, exe }: Tools) => {
  const wineBin = wine.replace("/proton'", "/dist/bin/wine'")
  let winePrefix: string = prefix

  if (wine.includes('proton')) {
    const protonPrefix = winePrefix.replaceAll("'", '')
    winePrefix = `'${protonPrefix}/pfx'`
  }

  let command = `WINE=${wineBin} WINEPREFIX=${winePrefix} ${
    tool === 'winecfg' ? `${wineBin} ${tool}` : tool
  }`

  if (tool === 'runExe') {
    command = `WINEPREFIX=${winePrefix} ${wineBin} ${exe}`
  }

  console.log({ command })
  return exec(command)
})

ipcMain.on('requestSettings', (event, appName) => {
  let settings: AppSettings
  if (appName !== 'default') {
    writeGameconfig(appName)
  }
  // @ts-ignore
  const defaultSettings = JSON.parse(readFileSync(heroicConfigPath))
  if (appName === 'default') {
    return event.reply('defaultSettings', defaultSettings.defaultSettings)
  }
  if (existsSync(`${heroicGamesConfigPath}${appName}.json`)) {
    settings = JSON.parse(
      // @ts-ignore
      readFileSync(`${heroicGamesConfigPath}${appName}.json`)
    )
    return event.reply(appName, settings[appName])
  }
  return event.reply(appName, defaultSettings.defaultSettings)
})

//Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', () => isLoggedIn())

ipcMain.on('openLoginPage', () => spawn('xdg-open', [loginUrl]))

ipcMain.on('openSidInfoPage', () => spawn('xdg-open', [sidInfoUrl]))

ipcMain.on('getLog', (event, appName) =>
  spawn('xdg-open', [`${heroicGamesConfigPath}/${appName}-lastPlay.log`])
)

ipcMain.handle('readFile', async (event, file) => {
  const loggedIn = isLoggedIn()

  if (!isLoggedIn) {
    return { user: { displayName: null }, library: [] }
  }

  const installed = `${legendaryConfigPath}/installed.json`
  const files: any = {
    // @ts-ignore
    user: loggedIn ? JSON.parse(readFileSync(userInfo)) : { displayName: null },
    library: `${legendaryConfigPath}/metadata/`,
    config: heroicConfigPath,
    installed: await statAsync(installed)
      // @ts-ignore
      .then(() => JSON.parse(readFileSync(installed)))
      .catch(() => []),
  }

  if (file === 'user') {
    if (loggedIn) {
      return files[file].displayName
    }
    return null
  }

  if (file === 'library') {
    const library = existsSync(files.library)
    const fallBackImage =
      'https://user-images.githubusercontent.com/26871415/103480183-1fb00680-4dd3-11eb-9171-d8c4cc601fba.jpg'

    if (library) {
      return (
        readdirSync(files.library)
          .map((file) => `${files.library}/${file}`)
          // @ts-ignore
          .map((file) => JSON.parse(readFileSync(file)))
          .map(({ app_name, metadata }) => {
            const {
              description,
              keyImages,
              title,
              developer,
              customAttributes: { CloudSaveFolder },
            } = metadata
            const cloudSaveEnabled = Boolean(CloudSaveFolder)
            const saveFolder = cloudSaveEnabled ? CloudSaveFolder.value : ''
            const gameBox = keyImages.filter(
              ({ type }: KeyImage) => type === 'DieselGameBox'
            )[0]
            const gameBoxTall = keyImages.filter(
              ({ type }: KeyImage) => type === 'DieselGameBoxTall'
            )[0]
            const logo = keyImages.filter(
              ({ type }: KeyImage) => type === 'DieselGameBoxLogo'
            )[0]

            const art_cover = gameBox ? gameBox.url : null
            const art_logo = logo ? logo.url : null
            const art_square = gameBoxTall ? gameBoxTall.url : fallBackImage

            const installedGames: Game[] = Object.values(files.installed)
            const isInstalled = Boolean(
              installedGames.filter((game) => game.app_name === app_name).length
            )
            const info = isInstalled
              ? installedGames.filter((game) => game.app_name === app_name)[0]
              : {}

            const {
              executable = null,
              version = null,
              install_size = null,
              install_path = null,
            } = info as InstalledInfo

            const convertedSize = `${byteSize(install_size).value}${
              byteSize(install_size).unit
            }`

            return {
              isInstalled,
              info,
              title,
              executable,
              version,
              install_size: convertedSize,
              install_path,
              app_name,
              developer,
              description,
              cloudSaveEnabled,
              saveFolder,
              art_cover: art_cover || art_square,
              art_square: art_square || art_cover,
              art_logo,
            }
          })
          .sort((a, b) => {
            const gameA = a.title.toUpperCase()
            const gameB = b.title.toUpperCase()
            return gameA < gameB ? -1 : 1
          })
      )
    }
    return []
  }
  return files[file]
})

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
    showErrorBox('Error', 'Invalid Path')
    return 'Error'
  }
})

ipcMain.handle('syncSaves', async (event, args) => {
  const [arg = '', path, appName] = args
  const command = `${legendaryBin} sync-saves --save-path ${path} ${arg} ${appName} -y`
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
