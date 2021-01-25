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
} from 'fs'
import { homedir } from 'os'
const execAsync = promisify(exec)
import { fixPathForAsarUnpack } from 'electron-util'
import { join } from 'path'
import { app, dialog } from 'electron'
import * as axios from 'axios'
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
const getAlternativeWine = () => {
  // Just add a new string here in case another path is found on another distro
  const steamPaths: string[] = [
    `${home}/.local/share/Steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
    '/usr/share/steam/',
  ]
  const protonPaths: string[] = [`${heroicToolsPath}/proton`]
  const foundPaths = steamPaths.filter((path) => existsSync(path))

  foundPaths.forEach((path) => {
    protonPaths.push(`${path}/steamapps/common/`)
    protonPaths.push(`${path}/compatibilitytools.d/`)
    return
  })

  const lutrisPath = `${home}/.local/share/lutris`
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`
  const proton: { name: string; bin: string }[] = []
  const altWine: { name: string; bin: string }[] = []

  const defaultWine = { name: 'Wine Default', bin: '/usr/bin/wine' }

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

  return [...proton, ...altWine, defaultWine]
}

const isLoggedIn = () => existsSync(userInfo)

const updateGame = (game: any) => {
  const logPath = `${heroicGamesConfigPath}${game}.log`
  const command = `${legendaryBin} update ${game} -y &> ${logPath}`
  return execAsync(command, { shell: '/bin/bash' })
    .then(console.log)
    .catch(console.log)
}

const launchGame = async (appName: any) => {
  let envVars = ''
  let dxvkPrefix = ''
  let gameMode

  const gameConfig = `${heroicGamesConfigPath}${appName}.json`
  const globalConfig = heroicConfigPath
  let settingsPath = gameConfig
  let settingsName = appName

  if (!existsSync(gameConfig)) {
    settingsPath = globalConfig
    settingsName = 'defaultSettings'
  }

  //@ts-ignore
  const settings = JSON.parse(readFileSync(settingsPath))
  const {
    winePrefix,
    wineVersion,
    otherOptions,
    useGameMode,
    showFps,
  } = settings[settingsName]

  let wine = `--wine ${wineVersion.bin}`
  let prefix = `--wine-prefix ${winePrefix}`

  envVars = otherOptions
  const isProton = wineVersion.name.startsWith('Proton')
  prefix = isProton ? '' : `--wine-prefix ${winePrefix}`

  if (isProton) {
    envVars = `${otherOptions} STEAM_COMPAT_DATA_PATH=${winePrefix}`
    console.log(
      `\n You are using Proton, this can lead to some bugs, 
            please do not open issues with bugs related with games`,
      wineVersion.name
    )
  }

  // Install DXVK for non Proton Prefixes
  if (!isProton) {
    dxvkPrefix = winePrefix
    await installDxvk(dxvkPrefix)
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
  const dxvkFps = showFps ? 'DXVK_HUD=fps' : ''

  const command = `${envVars} ${dxvkFps} ${runWithGameMode} ${legendaryBin} launch ${appName} ${wine} ${prefix}`
  console.log('\n Launch Command:', command)

  if (isProton && !existsSync(`'${winePrefix}'`)) {
    await execAsync(`mkdir '${winePrefix}' -p`)
  }

  return execAsync(command)
    .then(({ stderr }) => {
      writeFile(
        `${heroicGamesConfigPath}${appName}-lastPlay.log`,
        stderr,
        () => 'done'
      )
      if (stderr.includes('Errno')) {
        showErrorBox(
          'Something Went Wrong',
          'Error when launching the game, check the logs!'
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

const writeDefaultconfig = () => {
  const config = {
    defaultSettings: {
      defaultInstallPath: heroicInstallPath,
      wineVersion: {
        name: 'Wine Default',
        bin: '/usr/bin/wine',
      },
      winePrefix: '~/.wine',
      otherOptions: '',
      useGameMode: false,
      showFps: false,
    },
  }
  if (!existsSync(heroicConfigPath)) {
    writeFile(heroicConfigPath, JSON.stringify(config, null, 2), () => {
      return 'done'
    })
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

const writeGameconfig = (game: any) => {
  const {
    wineVersion,
    winePrefix,
    otherOptions,
    useGameMode,
    showFps,
    //@ts-ignore
  } = JSON.parse(readFileSync(heroicConfigPath)).defaultSettings
  const config = {
    [game]: {
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      showFps,
    },
  }

  if (!existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    writeFileSync(
      `${heroicGamesConfigPath}${game}.json`,
      JSON.stringify(config, null, 2),
      //@ts-ignore
      () => 'done'
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

  if (newVersion > currentVersion) {
    const { response } = await showMessageBox({
      title: 'Update Available',
      message:
        'There is a new version of Heroic Available, do you want to update now?',
      buttons: ['YES', 'NO'],
    })

    if (response === 0) {
      return exec(`xdg-open ${heroicGithubURL}`)
    }
    return
  }
}

async function getLatestDxvk() {
  const {
    data: { assets },
  } = await axios.default.get(
    'https://api.github.com/repos/lutris/dxvk/releases/latest'
  )
  const current = assets[0]
  const name = current.name.replace('.tar.gz', '')
  const downloadUrl = current.browser_download_url

  const dxvkLatest = `${heroicToolsPath}/DXVK/${name}`
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

  if (!existsSync(`${heroicToolsPath}/DXVK/latest_dxvk`)) {
    console.log('dxvk not found!')
    await getLatestDxvk()
  }

  const globalVersion = readFileSync(`${heroicToolsPath}/DXVK/latest_dxvk`)
    .toString()
    .split('\n')[0]
  const dxvkPath = `${heroicToolsPath}/DXVK/${globalVersion}/`
  const currentVersionCheck = `${prefix.replaceAll("'", '')}/current_dxvk`
  let currentVersion = ''

  if (existsSync(currentVersionCheck)) {
    currentVersion = readFileSync(currentVersionCheck).toString().split('\n')[0]
  }

  if (currentVersion === globalVersion) {
    return
  }

  const installCommand = `WINEPREFIX=${prefix} bash ${dxvkPath}setup_dxvk.sh install`
  const echoCommand = `echo '${globalVersion}' > ${currentVersionCheck}`
  console.log(`installing DXVK on ${prefix}`, installCommand)
  await execAsync(`WINEPREFIX=${prefix} wineboot`)
  await execAsync(installCommand, { shell: '/bin/bash' }).then(() =>
    exec(echoCommand)
  )
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    copyright: 'GPL V3',
    applicationVersion: `${app.getVersion()} Absalom`,
    website: 'https://github.com/flavioislima/HeroicGamesLauncher',
    iconPath: icon,
  })
  return app.showAboutPanel()
}

const handleExit = async () => {
  if (existsSync(`${heroicGamesConfigPath}/lock`)) {
    const { response } = await showMessageBox({
      title: 'Exit',
      message: 'Games are being download, are you sure?',
      buttons: ['NO', 'YES'],
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
  isLoggedIn,
  launchGame,
  writeDefaultconfig,
  writeGameconfig,
  checkForUpdates,
  handleExit,
  userInfo,
  getLatestDxvk,
  installDxvk,
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
