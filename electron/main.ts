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
  writeGameconfig,
  home,
  sidInfoUrl,
  updateGame,
  checkForUpdates,
  showAboutWindow,
  kofiURL,
  handleExit,
  heroicGithubURL,
  iconDark,
  getSettings,
  iconLight,
  getLatestDxvk,
} from './utils'

import { spawn, exec } from 'child_process'
import * as path from 'path'
import isDev from 'electron-is-dev'
import i18next from 'i18next'
import Backend from 'i18next-fs-backend'

import {
  readFileSync,
  writeFile,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'graceful-fs'
import { promisify } from 'util'
import axios from 'axios'
import { userInfo as user, cpus } from 'os'

const execAsync = promisify(exec)

import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  Menu,
  Tray,
  powerSaveBlocker,
} from 'electron'
import { Game } from './types.js'
import { getLegendaryConfig } from './legendary_utils/library'
let mainWindow: BrowserWindow = null

function createWindow(): BrowserWindow {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: isDev ? 1800 : 1280,
    height: isDev ? 1200 : 720,
    minHeight: 700,
    minWidth: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  })

  setTimeout(() => {
    getLatestDxvk()
  }, 2500)

  //load the index.html from a url
  if (isDev) {
    //@ts-ignore
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
      label: i18next.t('tray.show'),
      click: function () {
        mainWindow.show()
      },
    },
    {
      label: i18next.t('tray.about', 'About'),
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
      label: i18next.t('tray.support', 'Support Us'),
      click: function () {
        exec(`xdg-open ${kofiURL}`)
      },
    },
    {
      label: i18next.t('tray.reload', 'Reload'),
      click: function () {
        mainWindow.reload()
      },
      accelerator: 'ctrl + R',
    },
    {
      label: i18next.t('tray.quit', 'Quit'),
      click: function () {
        handleExit()
      },
    },
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
      lng: language,
      fallbackLng: 'en',
      supportedLngs: ['en', 'pt', 'de', 'ru', 'fr', 'pl', 'tr', 'es'],
      debug: false,
      backend: {
        allowMultiLoading: false,
        addPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}'),
        loadPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}.json'),
      },
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
    title: args[0],
    body: args[1],
  })

  notify.on('click', () => mainWindow.show())
  notify.show()
})

ipcMain.on('openSupportPage', () => exec(`xdg-open ${kofiURL}`))

ipcMain.on('openReleases', () => exec(`xdg-open ${heroicGithubURL}`))

ipcMain.handle('checkVersion', () => checkForUpdates())

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

/* const storage: Storage = mainWindow.localStorage
const lang = storage.getItem('language') */

const fetchGraphQl = async (namespace: string, game:string) => {
  const graphql = JSON.stringify({
    query: `{Catalog{catalogOffers( namespace:"${namespace}"){elements {productSlug}}}}`,
    variables: {}
  })
  const result = await axios("https://www.epicgames.com/graphql", {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    data: graphql
  })
  const res = result.data.data.Catalog.catalogOffers
  const slug = res.elements.find((e: { productSlug: string }) => e.productSlug)
  if (slug) {
    console.log('SLUG',slug)
    return slug.productSlug.replace(/(\/.*)/, '')
  } else {
    console.log('game',game)
    return game
  }
}




ipcMain.handle('getGameInfo', async (event, game, namespace: string | null) => {
  let lang = JSON.parse(readFileSync(heroicConfigPath, 'utf-8')).defaultSettings
    .language
  if (lang === 'pt') {
    lang = 'pt-BR'
  }

  let epicUrl:string;
  if (namespace) {
    const fetch:string = await fetchGraphQl(namespace, game)

    epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${fetch}`
  } else {
    epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${game}`
  }
  try {
    const response = await axios({
      url: epicUrl,
      method: 'GET',
    })
    delete response.data.pages[0].data.requirements.systems[0].details[0]
    const about = response.data.pages.find((e: { type: string }) => e.type === "productHome")
    return { 'about': about.data.about, 'reqs': about.data.requirements.systems[0].details }
  } catch (error) {
    return {}
  }
})

ipcMain.handle('launch', (event, appName) => {
  console.log('launching', appName)

  return launchGame(appName).catch(console.log)
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
  const { defaultInstallPath, maxWorkers } = await getSettings('default')
  const workers = maxWorkers ? `--max-workers ${maxWorkers}` : ''

  const logPath = `${heroicGamesConfigPath}${game}.log`
  let command = `${legendaryBin} install ${game} --base-path '${path}' ${workers} -y &> ${logPath}`
  if (path === 'default') {
    command = `${legendaryBin} install ${game} --base-path ${defaultInstallPath} ${workers} -y |& tee ${logPath}`
  }
  console.log(`Installing ${game} with:`, command)
  const noSpaceMsg = 'Not enough available disk space'
  return await execAsync(command, { shell: '/bin/bash' })
    .then(() => console.log('finished installing'))
    .catch(async () => {
      try {
        const { stdout } = await execAsync(
          `tail ${logPath} | grep 'disk space'`
        )
        if (stdout.includes(noSpaceMsg)) {
          console.log(noSpaceMsg)
          return stdout
        }
        console.log('installation canceled or had some error')
      } catch (err) {
        return err
      }
    })
})

ipcMain.handle('repair', async (event, game) => {
  const { maxWorkers } = await getSettings('default')
  const workers = maxWorkers ? `--max-workers ${maxWorkers}` : ''

  const logPath = `${heroicGamesConfigPath}${game}.log`
  const command = `${legendaryBin} repair ${game} ${workers} -y &> ${logPath}`

  console.log(`Repairing ${game} with:`, command)
  await execAsync(command, { shell: '/bin/bash' })
    .then(() => console.log('finished repairing'))
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

ipcMain.handle('requestGameProgress', async (event, appName) => {
  const logPath = `${heroicGamesConfigPath}${appName}.log`
  const command = `tail ${logPath} | grep 'Progress: ' | awk '{print $5 $6 $11}'`
  const { stdout } = await execAsync(command)
  const status = `${stdout.split('\n')[0]}`.split('(')
  const percent = status[0]
  const eta = status[1] ? status[1].split(',')[1] : ''
  const bytes = status[1] ? status[1].split(',')[0].replace(')', 'MB') : ''
  if (percent && bytes && eta) {
    const progress = { percent, bytes, eta }
    console.log(
      `Progress: ${appName} ${progress.percent}/${progress.bytes}/${eta}`
    )
    return progress
  }
  return ''
})

ipcMain.on('kill', (event, game) => {
  console.log('killing', game)
  return spawn('pkill', ['-f', game])
})

ipcMain.on('openFolder', (event, folder) => spawn('xdg-open', [folder]))

ipcMain.handle('getAlternativeWine', () => getAlternativeWine())

// Calls WineCFG or Winetricks. If is WineCFG, use the same binary as wine to launch it to dont update the prefix
interface Tools {
  tool: string
  wine: string
  prefix: string
  exe: string
}

ipcMain.on('callTool', async (event, { tool, wine, prefix, exe }: Tools) => {
  const wineBin = wine.replace("/proton'", "/dist/bin/wine'")
  let winePrefix: string = prefix.replace('~', home)

  if (wine.includes('proton')) {
    const protonPrefix = winePrefix.replaceAll("'", '')
    winePrefix = `'${protonPrefix}/pfx'`
  }

  let command = `WINE=${wineBin} WINEPREFIX=${winePrefix} ${tool === 'winecfg' ? `${wineBin} ${tool}` : tool
    }`

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
    writeGameconfig(appName)
  }

  return await getSettings(appName)
})

//Checks if the user have logged in with Legendary already
ipcMain.handle('isLoggedIn', () => isLoggedIn())

ipcMain.on('openLoginPage', () => spawn('xdg-open', [loginUrl]))

ipcMain.on('openSidInfoPage', () => spawn('xdg-open', [sidInfoUrl]))

ipcMain.on('getLog', (event, appName) =>
  spawn('xdg-open', [`${heroicGamesConfigPath}/${appName}-lastPlay.log`])
)

const installed = `${legendaryConfigPath}/installed.json`

ipcMain.handle('moveInstall', async (event, [appName, path]: string[]) => {
  const file = JSON.parse(readFileSync(installed, 'utf8'))
  const installedGames: Game[] = Object.values(file)
  const { install_path } = installedGames.filter(
    (game) => game.app_name === appName
  )[0]

  const splitPath = install_path.split('/')
  const installFolder = splitPath[splitPath.length - 1]
  const newPath = `${path}/${installFolder}`
  const game: Game = { ...file[appName], install_path: newPath }
  const modifiedInstall = { ...file, [appName]: game }
  return await execAsync(`mv -f ${install_path} ${newPath}`)
    .then(() => {
      writeFile(installed, JSON.stringify(modifiedInstall, null, 2), () =>
        console.log(`Finished moving ${appName} to ${newPath}`)
      )
    })
    .catch(console.log)
})

ipcMain.handle(
  'changeInstallPath',
  async (event, [appName, newPath]: string[]) => {
    const file = JSON.parse(readFileSync(installed, 'utf8'))
    const game: Game = { ...file[appName], install_path: newPath }
    const modifiedInstall = { ...file, [appName]: game }
    writeFileSync(installed, JSON.stringify(modifiedInstall, null, 2))
    console.log(`Finished moving ${appName} to ${newPath}`)
  }
)

ipcMain.handle('readFile', async (event, file) => getLegendaryConfig(file))

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
  return { user: user().username, epicId: account_id }
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

  const command = `${legendaryBin} sync-saves --save-path "${path}" ${arg} ${appName} -y`
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
