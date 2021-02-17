/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import { promisify } from 'util'
import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFile,
  mkdir,
  writeFileSync,
} from 'graceful-fs'
import { homedir, userInfo as user } from 'os'
const execAsync = promisify(exec)
import { fixPathForAsarUnpack } from 'electron-util'
import { join } from 'path'
import { app, dialog } from 'electron'
import * as axios from 'axios'
import { AppSettings, WineProps } from './types'
import i18next from 'i18next'
const { showErrorBox, showMessageBox } = dialog

const home = homedir()
const legendaryConfigPath = `${home}/.config/legendary`
const heroicFolder = `${home}/.config/heroic/`
const heroicConfigPath = `${heroicFolder}config.json`
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`
const heroicToolsPath = `${heroicFolder}tools`
const userInfo = `${legendaryConfigPath}/user.json`
const heroicInstallPath = `${home}/Games/Heroic`
const legendaryBin = fixPathForAsarUnpack(join(__dirname, '/bin/legendary'))
const icon = fixPathForAsarUnpack(join(__dirname, '/icon.png'))
const iconDark = fixPathForAsarUnpack(join(__dirname, '/icon-dark.png'))
const iconLight = fixPathForAsarUnpack(join(__dirname, '/icon-light.png'))
const loginUrl =
  'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
const sidInfoUrl =
  'https://github.com/flavioislima/HeroicGamesLauncher/issues/42'
const heroicGithubURL =
  'https://github.com/flavioislima/HeroicGamesLauncher/releases/latest'
const kofiURL = 'https://ko-fi.com/flavioislima'

// check other wine versions installed
async function getAlternativeWine(): Promise<WineProps[]> {
  // Just add a new string here in case another path is found on another distro
  const steamPaths: string[] = [
    `${home}/.local/share/Steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
    '/usr/share/steam',
  ]
  const protonPaths: string[] = [`${heroicToolsPath}/proton`]
  const foundPaths = steamPaths.filter((path) => existsSync(path))

  const defaultWine = { name: '', bin: '' }
  await execAsync(`which wine`)
    .then(async ({ stdout }) => {
      defaultWine.bin = stdout.split('\n')[0]
      const { stdout: out } = await execAsync(`wine --version`)
      defaultWine.name = `Wine - ${out.split('\n')[0]}`
    })
    .catch(() => console.log('Wine not installed'))

  foundPaths.forEach((path) => {
    protonPaths.push(`${path}/steamapps/common/`)
    protonPaths.push(`${path}/compatibilitytools.d/`)
    return
  })

  const lutrisPath = `${home}/.local/share/lutris`
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`
  const proton: { name: string; bin: string }[] = []
  const altWine: { name: string; bin: string }[] = []

  protonPaths.forEach((path) => {
    if (existsSync(path)) {
      readdirSync(path).forEach((version) => {
        if (version.toLowerCase().startsWith('proton')) {
          proton.push({
            name: `Proton - ${version}`,
            bin: `'${path}${version}/proton'`,
          })
        }
      })
    }
  })

  if (existsSync(lutrisCompatPath)) {
    readdirSync(lutrisCompatPath).forEach((version) => {
      altWine.push({
        name: `Wine - ${version}`,
        bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
      })
    })
  }

  readdirSync(`${heroicToolsPath}/wine`).forEach((version) => {
    altWine.push({
      name: `Wine - ${version}`,
      bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
    })
  })

  return [defaultWine, ...altWine, ...proton]
}

const isLoggedIn = () => existsSync(userInfo)

const getSettings = (appName: string | 'default'): AppSettings => {
  const gameConfig = `${heroicGamesConfigPath}${appName}.json`

  const globalConfig = heroicConfigPath
  let settingsPath = gameConfig
  let settingsName = appName

  if (appName === 'default' || !existsSync(gameConfig)) {
    settingsPath = globalConfig
    settingsName = 'defaultSettings'
    if (!existsSync(settingsPath)) {
      writeDefaultconfig()
      return getSettings('default')
    }
  }

  const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  return settings[settingsName]
}

const getUserInfo = () => {
  if (existsSync(userInfo)) {
    return JSON.parse(readFileSync(userInfo, 'utf-8'))
  }
  return { account_id: '' }
}

const updateGame = (game: string) => {
  const logPath = `${heroicGamesConfigPath}${game}.log`
  const command = `${legendaryBin} update ${game} -y &> ${logPath}`
  return execAsync(command, { shell: '/bin/bash' })
    .then(console.log)
    .catch(console.log)
}

const launchGame = async (appName: string) => {
  let envVars = ''
  let dxvkPrefix = ''
  let gameMode

  const {
    winePrefix,
    wineVersion,
    otherOptions,
    useGameMode,
    showFps,
    launcherArgs = '',
    showMangohud,
    audioFix,
    autoInstallDxvk,
  } = getSettings(appName)

  const wineTricksCommand = `WINE=${wineVersion.bin} WINEPREFIX=${dxvkPrefix} winetricks`
  let wine = `--wine ${wineVersion.bin}`

  // We need to keep replacing the ' to keep compatibility with old configs
  let prefix = `--wine-prefix '${winePrefix
    .replaceAll("'", '')
    .replace('~', home)}'`

  const isProton = wineVersion.name.startsWith('Proton')
  prefix = isProton ? '' : prefix

  const options = {
    other: otherOptions ? otherOptions : '',
    fps: showFps ? `DXVK_HUD=fps` : '',
    audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
    showMangohud: showMangohud ? `MANGOHUD=1` : '',
    proton: isProton
      ? `STEAM_COMPAT_DATA_PATH='${winePrefix
          .replaceAll("'", '')
          .replace('~', home)}'`
      : '',
  }

  envVars = Object.values(options).join(' ')
  if (isProton) {
    console.log(
      `\n You are using Proton, this can lead to some bugs, 
            please do not open issues with bugs related with games`,
      wineVersion.name
    )
  }

  // start the new prefix if it doesn't exists
  if (!existsSync(`'${winePrefix}'`)) {
    let command = `${wineTricksCommand} sandbox`

    if (isProton) {
      command = `mkdir '${winePrefix}' -p`
      await execAsync(command)
    }

    await execAsync(command)
  }

  // Install DXVK for non Proton Prefixes
  if (!isProton && autoInstallDxvk) {
    dxvkPrefix = winePrefix
    await execAsync(`${wineTricksCommand} dxvk`)
  }

  if (wineVersion.name !== 'Wine Default') {
    const { bin } = wineVersion
    wine = isProton ? `--no-wine --wrapper "${bin} run"` : `--wine ${bin}`
  }

  // check if Gamemode is installed
  await execAsync(`which gamemoderun`)
    .then(({ stdout }) => (gameMode = stdout.split('\n')[0]))
    .catch(() => console.log('GameMode not installed'))

  const runWithGameMode = useGameMode && gameMode ? gameMode : ''

  const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${appName}  ${wine} ${prefix} ${launcherArgs}`
  console.log('\n Launch Command:', command)

  return execAsync(command)
    .then(({ stderr }) => {
      writeFile(
        `${heroicGamesConfigPath}${appName}-lastPlay.log`,
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
    })
    .catch(async ({ stderr }) => {
      writeFile(
        `${heroicGamesConfigPath}${appName}-lastPlay.log`,
        stderr,
        () => 'done'
      )
      return stderr
    })
}

const writeDefaultconfig = async () => {
  const { account_id } = getUserInfo()
  const userName = user().username
  let wineVersion = {}
  getAlternativeWine().then((w) => (wineVersion = w[0]))

  const config = {
    defaultSettings: {
      defaultInstallPath: heroicInstallPath,
      wineVersion,
      winePrefix: `${home}/.wine`,
      otherOptions: '',
      useGameMode: false,
      showFps: false,
      language: 'en',
      userInfo: {
        name: userName,
        epicId: account_id,
      },
    },
  }
  if (!existsSync(heroicConfigPath)) {
    writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2))
  }

  if (!existsSync(heroicGamesConfigPath)) {
    mkdir(heroicGamesConfigPath, () => {
      return 'done'
    })
  }

  if (!existsSync(`${heroicToolsPath}/wine`)) {
    exec(`mkdir '${heroicToolsPath}/wine' -p`, () => {
      return 'done'
    })
  }

  if (!existsSync(`${heroicToolsPath}/proton`)) {
    exec(`mkdir '${heroicToolsPath}/proton' -p`, () => {
      return 'done'
    })
  }
}

const writeGameconfig = (game: string) => {
  const {
    wineVersion,
    winePrefix,
    otherOptions,
    useGameMode,
    showFps,
    userInfo,
  } = getSettings('default')

  const config = {
    [game]: {
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      showFps,
      userInfo,
    },
  }

  if (!existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    writeFileSync(
      `${heroicGamesConfigPath}${game}.json`,
      JSON.stringify(config, null, 2),
      null
    )
  }
}

async function checkForUpdates() {
  const {
    data: { tag_name },
  } = await axios.default.get(
    'https://api.github.com/repos/flavioislima/HeroicGamesLauncher/releases/latest'
  )

  const newVersion = tag_name.replace('v', '').replaceAll('.', '')
  const currentVersion = app.getVersion().replaceAll('.', '')

  return newVersion > currentVersion
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    copyright: 'GPL V3',
    applicationVersion: `${app.getVersion()} Magelan`,
    website: 'https://github.com/flavioislima/HeroicGamesLauncher',
    iconPath: icon,
  })
  return app.showAboutPanel()
}

const handleExit = async () => {
  const isLocked = existsSync(`${heroicGamesConfigPath}/lock`)

  if (isLocked) {
    const { response } = await showMessageBox({
      title: i18next.t('box.quit.title', 'Exit'),
      message: i18next.t(
        'box.quit.message',
        'There are pending operations, are you sure?'
      ),
      buttons: [i18next.t('box.no'), i18next.t('box.yes')],
    })

    if (response === 0) {
      return
    }
    return app.exit()
  }
  app.exit()
}

export {
  getAlternativeWine,
  getSettings,
  isLoggedIn,
  launchGame,
  writeDefaultconfig,
  writeGameconfig,
  checkForUpdates,
  handleExit,
  userInfo,
  heroicConfigPath,
  heroicFolder,
  heroicGamesConfigPath,
  legendaryConfigPath,
  legendaryBin,
  showAboutWindow,
  icon,
  iconDark,
  iconLight,
  home,
  loginUrl,
  sidInfoUrl,
  updateGame,
  kofiURL,
  heroicGithubURL,
}
