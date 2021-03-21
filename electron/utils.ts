import * as axios from 'axios'
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { app, dialog } from 'electron'
import { exec } from 'child_process'
import {
  existsSync,
  mkdir,
  readFileSync,
  readdirSync,
  writeFile,
  writeFileSync,
} from 'graceful-fs'
import { fixPathForAsarUnpack } from 'electron-util'
import { homedir, userInfo as user } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import i18next from 'i18next'
import isOnline from 'is-online'

import { AppSettings, UserInfo, WineProps } from './types'

const execAsync = promisify(exec)

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
const supportURL =
  'https://github.com/flavioislima/HeroicGamesLauncher/blob/main/Support.md'
const discordLink = 'https://discord.gg/rHJ2uqdquK'

// check other wine versions installed
async function getAlternativeWine(): Promise<WineProps[]> {
  // Just add a new string here in case another path is found on another distro
  const steamPaths: string[] = [
    `${home}/.local/share/Steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
    '/usr/share/steam',
  ]

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

  const protonPaths: string[] = [`${heroicToolsPath}/proton/`]
  const foundPaths = steamPaths.filter((path) => existsSync(path))

  const defaultWine = { bin: '', name: '' }
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
  const proton: Set<{ bin: string; name: string }> = new Set()
  const altWine: Set<{ bin: string; name: string }> = new Set()
  const customPaths: Set<{ bin: string; name: string }> = new Set()

  protonPaths.forEach((path) => {
    if (existsSync(path)) {
      readdirSync(path).forEach((version) => {
        if (version.toLowerCase().startsWith('proton')) {
          proton.add({
            bin: `'${path}${version}/proton'`,
            name: `Proton - ${version}`,
          })
        }
      })
    }
  })

  if (existsSync(lutrisCompatPath)) {
    readdirSync(lutrisCompatPath).forEach((version) => {
      altWine.add({
        bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
        name: `Wine - ${version}`,
      })
    })
  }

  readdirSync(`${heroicToolsPath}/wine/`).forEach((version) => {
    altWine.add({
      bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
      name: `Wine - ${version}`,
    })
  })

  // skips this on new installations to avoid infinite loops
  if (existsSync(heroicConfigPath)) {
    const { customWinePaths } = await getSettings('default')
    if (customWinePaths.length) {
      customWinePaths.forEach((path: string) => {
        if (path.endsWith('proton')) {
          return customPaths.add({
            bin: `'${path}'`,
            name: `Proton Custom - ${path}`,
          })
        }
        return customPaths.add({
          bin: `'${path}'`,
          name: `Wine Custom - ${path}`,
        })
      })
    }
  }

  return [defaultWine, ...altWine, ...proton, ...customPaths]
}

const isLoggedIn = () => existsSync(userInfo)

const getSettings = async (appName = 'default'): Promise<AppSettings> => {
  const gameConfig = `${heroicGamesConfigPath}${appName}.json`

  const globalConfig = heroicConfigPath
  let settingsPath = gameConfig
  let settingsName = appName

  if (appName === 'default' || !existsSync(gameConfig)) {
    settingsPath = globalConfig
    settingsName = 'defaultSettings'
    if (!existsSync(settingsPath)) {
      await writeDefaultconfig()
      return getSettings('default')
    }
  }

  const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  return settings[settingsName]
}

export const getUserInfo = (): UserInfo => {
  if (existsSync(userInfo)) {
    return JSON.parse(readFileSync(userInfo, 'utf-8'))
  }
  return { account_id: '', displayName: null }
}

const updateGame = async (game: string) => {
  if (!isOnline()) {
    console.log(`App offline, skipping update for game '${game}'.`)
    return
  }
  const logPath = `${heroicGamesConfigPath}${game}.log`
  const command = `${legendaryBin} update ${game} -y &> ${logPath}`

  try {
    await execAsync(command, { shell: '/bin/bash' })
  } catch (error) {
    return errorHandler(logPath)
  }
}

const launchGame = async (appName: string) => {
  let envVars = ''
  let gameMode: string

  const {
    winePrefix,
    wineVersion,
    otherOptions,
    useGameMode,
    showFps,
    offlineMode = false,
    launcherArgs = '',
    showMangohud,
    audioFix,
    autoInstallDxvk,
  } = await getSettings(appName)

  const fixedWinePrefix = winePrefix.replace('~', home)
  let wineCommand = `--wine ${wineVersion.bin}`

  const is_online = await isOnline()
  const offlineArg = !offlineMode && is_online ? '' : '--offline'

  // We need to keep replacing the ' to keep compatibility with old configs
  let prefix = `--wine-prefix '${fixedWinePrefix.replaceAll("'", '')}'`

  const isProton =
    wineVersion.name.startsWith('Proton') ||
    wineVersion.name.startsWith('Steam')
  prefix = isProton ? '' : prefix

  const options = {
    audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
    fps: showFps ? `DXVK_HUD=fps` : '',
    other: otherOptions ? otherOptions : '',
    proton: isProton
      ? `STEAM_COMPAT_DATA_PATH='${winePrefix
          .replaceAll("'", '')
          .replace('~', home)}'`
      : '',
    showMangohud: showMangohud ? `MANGOHUD=1` : '',
  }

  envVars = Object.values(options).join(' ')
  if (isProton) {
    console.log(
      `\n You are using Proton, this can lead to some bugs, 
            please do not open issues with bugs related with games`,
      wineVersion.name
    )
  }

  // Proton doesn't create a prefix folder so this is a workaround
  if (isProton && !existsSync(fixedWinePrefix)) {
    const command = `mkdir '${fixedWinePrefix}' -p`
    await execAsync(command)
  }

  // Install DXVK for non Proton Prefixes
  if (!isProton && autoInstallDxvk) {
    await installDxvk(winePrefix)
  }

  if (wineVersion.name !== 'Wine Default') {
    const { bin } = wineVersion
    wineCommand = isProton
      ? `--no-wine --wrapper "${bin} run"`
      : `--wine ${bin}`
  }

  // check if Gamemode is installed
  await execAsync(`which gamemoderun`)
    .then(({ stdout }) => (gameMode = stdout.split('\n')[0]))
    .catch(() => console.log('GameMode not installed'))

  const runWithGameMode = useGameMode && gameMode ? gameMode : ''

  const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${offlineArg} ${appName}  ${wineCommand} ${prefix} ${launcherArgs}`
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

async function getLatestDxvk() {
  if (!(await isOnline())) {
    console.log('App offline, skipping possible DXVK update.')
    return
  }
  const {
    data: { assets },
  } = await axios.default.get(
    'https://api.github.com/repos/lutris/dxvk/releases/latest'
  )
  const current = assets[0]
  const pkg = current.name
  const name = pkg.replace('.tar.gz', '')
  const downloadUrl = current.browser_download_url

  const dxvkLatest = `${heroicToolsPath}/DXVK/${pkg}`
  const pastVersionCheck = `${heroicToolsPath}/DXVK/latest_dxvk`
  let pastVersion = ''

  if (existsSync(pastVersionCheck)) {
    pastVersion = readFileSync(pastVersionCheck).toString().split('\n')[0]
  }

  if (pastVersion === name) {
    return
  }

  const downloadCommand = `curl -L ${downloadUrl} -o ${dxvkLatest} --create-dirs`
  const extractCommand = `tar -zxf ${dxvkLatest} -C ${heroicToolsPath}/DXVK/`
  const echoCommand = `echo ${name} > ${heroicToolsPath}/DXVK/latest_dxvk`
  const cleanCommand = `rm ${dxvkLatest}`

  console.log('Updating DXVK to:', name)

  return execAsync(downloadCommand)
    .then(async () => {
      console.log('downloaded DXVK')
      console.log('extracting DXVK')
      exec(echoCommand)
      await execAsync(extractCommand)
      console.log('DXVK updated!')
      exec(cleanCommand)
    })
    .catch(() => console.log('Error when downloading DXVK'))
}

async function installDxvk(prefix: string) {
  if (!prefix) {
    return
  }
  const winePrefix = prefix.replace('~', home)

  if (!existsSync(`${heroicToolsPath}/DXVK/latest_dxvk`)) {
    console.log('dxvk not found!')
    await getLatestDxvk()
  }

  const globalVersion = readFileSync(`${heroicToolsPath}/DXVK/latest_dxvk`)
    .toString()
    .split('\n')[0]
  const dxvkPath = `${heroicToolsPath}/DXVK/${globalVersion}/`
  const currentVersionCheck = `${winePrefix}/current_dxvk`
  let currentVersion = ''

  if (existsSync(currentVersionCheck)) {
    currentVersion = readFileSync(currentVersionCheck).toString().split('\n')[0]
  }

  if (currentVersion === globalVersion) {
    return
  }

  const installCommand = `WINEPREFIX=${winePrefix} bash ${dxvkPath}setup_dxvk.sh install`
  const echoCommand = `echo '${globalVersion}' > ${currentVersionCheck}`
  console.log(`installing DXVK on ${winePrefix}`, installCommand)
  await execAsync(`WINEPREFIX=${winePrefix} wineboot`)
  await execAsync(installCommand, { shell: '/bin/bash' })
    .then(() => exec(echoCommand))
    .catch(() =>
      console.log(
        'error when installing DXVK, please try launching the game again'
      )
    )
}

const writeDefaultconfig = async () => {
  if (!existsSync(heroicConfigPath)) {
    const { account_id } = getUserInfo()
    const userName = user().username
    const [defaultWine] = await getAlternativeWine()

    const config = {
      defaultSettings: {
        customWinePaths: [],
        defaultInstallPath: heroicInstallPath,
        language: 'en',
        maxWorkers: 0,
        otherOptions: '',
        showFps: false,
        useGameMode: false,
        userInfo: {
          epicId: account_id,
          name: userName,
        },
        winePrefix: `${home}/.wine`,
        wineVersion: defaultWine,
      } as AppSettings,
    }

    writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2))
  }

  if (!existsSync(heroicGamesConfigPath)) {
    mkdir(heroicGamesConfigPath, () => {
      return 'done'
    })
  }
}

const writeGameconfig = async (game: string) => {
  if (!existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    const {
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      showFps,
      userInfo,
    } = await getSettings('default')

    const config = {
      [game]: {
        otherOptions,
        showFps,
        useGameMode,
        userInfo,
        winePrefix,
        wineVersion,
      },
    }

    writeFileSync(
      `${heroicGamesConfigPath}${game}.json`,
      JSON.stringify(config, null, 2),
      null
    )
  }
}

async function checkForUpdates() {
  if (!(await isOnline())) {
    console.log('Version check failed, app is offline.')
    return false
  }
  try {
    const {
      data: { tag_name },
    } = await axios.default.get(
      'https://api.github.com/repos/flavioislima/HeroicGamesLauncher/releases/latest'
    )
    const newVersion = tag_name.replace('v', '').replaceAll('.', '')
    const currentVersion = app.getVersion().replaceAll('.', '')

    return newVersion > currentVersion
  } catch (error) {
    console.log('Could not check for new version of heroic')
  }
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    applicationVersion: `${app.getVersion()} Magelan`,
    copyright: 'GPL V3',
    iconPath: icon,
    website: 'https://github.com/flavioislima/HeroicGamesLauncher',
  })
  return app.showAboutPanel()
}

const checkGameUpdates = async (): Promise<Array<string>> => {
  if (!(await isOnline())) {
    console.log('App offline, skipping checking game updates.')
    return []
  }
  const command = `${legendaryBin} list-installed --check-updates --tsv | grep True | awk '{print $1}'`
  const { stdout } = await execAsync(command)
  const result = stdout.split('\n')
  return result
}

const handleExit = async () => {
  const isLocked = existsSync(`${heroicGamesConfigPath}/lock`)

  if (isLocked) {
    const { response } = await showMessageBox({
      buttons: [i18next.t('box.no'), i18next.t('box.yes')],
      message: i18next.t(
        'box.quit.message',
        'There are pending operations, are you sure?'
      ),
      title: i18next.t('box.quit.title', 'Exit'),
    })

    if (response === 0) {
      return
    }
    return app.exit()
  }
  app.exit()
}

async function errorHandler(logPath: string): Promise<void> {
  const noSpaceMsg = 'Not enough available disk space'
  return execAsync(`tail ${logPath} | grep 'disk space'`)
    .then(({ stdout }) => {
      if (stdout.includes(noSpaceMsg)) {
        console.log(noSpaceMsg)
        return showErrorBox(
          i18next.t('box.error.diskspace.title', 'No Space'),
          i18next.t(
            'box.error.diskspace.message',
            'Not enough available disk space'
          )
        )
      }
      return genericErrorMessage()
    })
    .catch(() => console.log('operation interrupted'))
}

function genericErrorMessage(): void {
  return showErrorBox(
    i18next.t('box.error.generic.title', 'Unknown Error'),
    i18next.t('box.error.generic.message', 'An Unknown Error has occurred')
  )
}

export {
  checkForUpdates,
  checkGameUpdates,
  discordLink,
  errorHandler,
  genericErrorMessage,
  getAlternativeWine,
  getLatestDxvk,
  getSettings,
  handleExit,
  heroicConfigPath,
  heroicFolder,
  heroicGamesConfigPath,
  heroicGithubURL,
  home,
  icon,
  iconDark,
  iconLight,
  isLoggedIn,
  isOnline,
  launchGame,
  legendaryBin,
  legendaryConfigPath,
  loginUrl,
  showAboutWindow,
  sidInfoUrl,
  supportURL,
  updateGame,
  userInfo,
  writeDefaultconfig,
  writeGameconfig,
}
