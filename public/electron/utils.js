'use strict'
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k]
          },
        })
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v })
      }
    : function (o, v) {
        o['default'] = v
      })
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod
    var result = {}
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k)
    __setModuleDefault(result, mod)
    return result
  }
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.heroicGithubURL = exports.kofiURL = exports.updateGame = exports.sidInfoUrl = exports.loginUrl = exports.home = exports.iconLight = exports.iconDark = exports.icon = exports.showAboutWindow = exports.legendaryBin = exports.legendaryConfigPath = exports.heroicGamesConfigPath = exports.heroicFolder = exports.heroicConfigPath = exports.installDxvk = exports.getLatestDxvk = exports.userInfo = exports.handleExit = exports.checkForUpdates = exports.writeGameconfig = exports.writeDefaultconfig = exports.launchGame = exports.isLoggedIn = exports.getAlternativeWine = void 0
/* eslint-disable @typescript-eslint/ban-ts-comment */
const child_process_1 = require('child_process')
const util_1 = require('util')
const fs_1 = require('fs')
const os_1 = require('os')
const execAsync = util_1.promisify(child_process_1.exec)
const electron_util_1 = require('electron-util')
const path_1 = require('path')
const electron_1 = require('electron')
const axios = __importStar(require('axios'))
const { showErrorBox, showMessageBox } = electron_1.dialog
const home = os_1.homedir()
exports.home = home
const legendaryConfigPath = `${home}/.config/legendary`
exports.legendaryConfigPath = legendaryConfigPath
const heroicFolder = `${home}/.config/heroic/`
exports.heroicFolder = heroicFolder
const heroicConfigPath = `${heroicFolder}config.json`
exports.heroicConfigPath = heroicConfigPath
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`
exports.heroicGamesConfigPath = heroicGamesConfigPath
const heroicToolsPath = `${heroicFolder}tools`
const userInfo = `${legendaryConfigPath}/user.json`
exports.userInfo = userInfo
const heroicInstallPath = `${home}/Games/Heroic`
const legendaryBin = electron_util_1.fixPathForAsarUnpack(
  path_1.join(__dirname, '/bin/legendary')
)
exports.legendaryBin = legendaryBin
const icon = electron_util_1.fixPathForAsarUnpack(
  path_1.join(__dirname, '/icon.png')
)
exports.icon = icon
const iconDark = electron_util_1.fixPathForAsarUnpack(
  path_1.join(__dirname, '/icon-dark.png')
)
exports.iconDark = iconDark
const iconLight = electron_util_1.fixPathForAsarUnpack(
  path_1.join(__dirname, '/icon-light.png')
)
exports.iconLight = iconLight
const loginUrl =
  'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
exports.loginUrl = loginUrl
const sidInfoUrl =
  'https://github.com/flavioislima/HeroicGamesLauncher/issues/42'
exports.sidInfoUrl = sidInfoUrl
const heroicGithubURL =
  'https://github.com/flavioislima/HeroicGamesLauncher/releases/latest'
exports.heroicGithubURL = heroicGithubURL
const kofiURL = 'https://ko-fi.com/flavioislima'
exports.kofiURL = kofiURL
// check other wine versions installed
const getAlternativeWine = () => {
  // Just add a new string here in case another path is found on another distro
  const steamPaths = [
    `${home}/.local/share/Steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
    '/usr/share/steam',
  ]
  const protonPaths = [`${heroicToolsPath}/proton`]
  const foundPaths = steamPaths.filter((path) => fs_1.existsSync(path))
  foundPaths.forEach((path) => {
    protonPaths.push(`${path}/steamapps/common/`)
    protonPaths.push(`${path}/compatibilitytools.d/`)
    return
  })
  const lutrisPath = `${home}/.local/share/lutris`
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`
  const proton = []
  const altWine = []
  const defaultWine = { name: 'Wine Default', bin: '/usr/bin/wine' }
  protonPaths.forEach((path) => {
    if (fs_1.existsSync(path)) {
      fs_1.readdirSync(path).forEach((version) => {
        if (version.toLowerCase().startsWith('proton')) {
          proton.push({
            name: `Proton - ${version}`,
            bin: `'${path}${version}/proton'`,
          })
        }
      })
    }
  })
  if (fs_1.existsSync(lutrisCompatPath)) {
    fs_1.readdirSync(lutrisCompatPath).forEach((version) => {
      altWine.push({
        name: `Wine - ${version}`,
        bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
      })
    })
  }
  fs_1.readdirSync(`${heroicToolsPath}/wine`).forEach((version) => {
    altWine.push({
      name: `Wine - ${version}`,
      bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
    })
  })
  return [...proton, ...altWine, defaultWine]
}
exports.getAlternativeWine = getAlternativeWine
const isLoggedIn = () => fs_1.existsSync(userInfo)
exports.isLoggedIn = isLoggedIn
const updateGame = (game) => {
  const logPath = `${heroicGamesConfigPath}${game}.log`
  const command = `${legendaryBin} update ${game} -y &> ${logPath}`
  return execAsync(command, { shell: '/bin/bash' })
    .then(console.log)
    .catch(console.log)
}
exports.updateGame = updateGame
const launchGame = (appName) =>
  __awaiter(void 0, void 0, void 0, function* () {
    let envVars = ''
    let dxvkPrefix = ''
    let gameMode
    const gameConfig = `${heroicGamesConfigPath}${appName}.json`
    const globalConfig = heroicConfigPath
    let settingsPath = gameConfig
    let settingsName = appName
    if (!fs_1.existsSync(gameConfig)) {
      settingsPath = globalConfig
      settingsName = 'defaultSettings'
    }
    //@ts-ignore
    const settings = JSON.parse(fs_1.readFileSync(settingsPath))
    const {
      winePrefix,
      wineVersion,
      otherOptions,
      useGameMode,
      showFps,
      launcherArgs = '',
      showMangohud,
      audioFix,
    } = settings[settingsName]
    console.log()
    let wine = `--wine ${wineVersion.bin}`
    let prefix = `--wine-prefix ${winePrefix.replace('~', home)}`
    const isProton = wineVersion.name.startsWith('Proton')
    prefix = isProton ? '' : prefix
    const options = {
      other: otherOptions ? otherOptions : '',
      fps: showFps ? `DXVK_HUD=fps` : '',
      audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
      showMangohud: showMangohud ? `MANGOHUD=1` : '',
      proton: isProton
        ? `STEAM_COMPAT_DATA_PATH=${winePrefix.replace('~', home)}`
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
    // Install DXVK for non Proton Prefixes
    if (!isProton) {
      dxvkPrefix = winePrefix
      yield installDxvk(dxvkPrefix)
    }
    if (wineVersion.name !== 'Wine Default') {
      const { bin } = wineVersion
      wine = isProton ? `--no-wine --wrapper "${bin} run"` : `--wine ${bin}`
    }
    // check if Gamemode is installed
    yield execAsync(`which gamemoderun`)
      .then(({ stdout }) => (gameMode = stdout.split('\n')[0]))
      .catch(() => console.log('GameMode not installed'))
    const runWithGameMode = useGameMode && gameMode ? gameMode : ''
    const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${appName}  ${wine} ${prefix} ${launcherArgs}`
    console.log('\n Launch Command:', command)
    if (isProton && !fs_1.existsSync(`'${winePrefix}'`)) {
      yield execAsync(`mkdir '${winePrefix}' -p`)
    }
    return execAsync(command)
      .then(({ stderr }) => {
        fs_1.writeFile(
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
      .catch(({ stderr }) =>
        __awaiter(void 0, void 0, void 0, function* () {
          fs_1.writeFile(
            `${heroicGamesConfigPath}${appName}-lastPlay.log`,
            stderr,
            () => 'done'
          )
          return stderr
        })
      )
  })
exports.launchGame = launchGame
const writeDefaultconfig = () => {
  // @ts-ignore
  const { account_id } = JSON.parse(fs_1.readFileSync(userInfo))
  const config = {
    defaultSettings: {
      defaultInstallPath: heroicInstallPath,
      wineVersion: {
        name: 'Wine Default',
        bin: '/usr/bin/wine',
      },
      winePrefix: `${home}/.wine`,
      otherOptions: '',
      useGameMode: false,
      showFps: false,
      userInfo: {
        name: os_1.userInfo,
        epicId: account_id,
      },
    },
  }
  if (!fs_1.existsSync(heroicConfigPath)) {
    fs_1.writeFile(heroicConfigPath, JSON.stringify(config, null, 2), () => {
      return 'done'
    })
  }
  if (!fs_1.existsSync(heroicGamesConfigPath)) {
    fs_1.mkdir(heroicGamesConfigPath, () => {
      return 'done'
    })
  }
  if (!fs_1.existsSync(`${heroicToolsPath}/wine`)) {
    child_process_1.exec(`mkdir '${heroicToolsPath}/wine' -p`, () => {
      return 'done'
    })
  }
  if (!fs_1.existsSync(`${heroicToolsPath}/proton`)) {
    child_process_1.exec(`mkdir '${heroicToolsPath}/proton' -p`, () => {
      return 'done'
    })
  }
}
exports.writeDefaultconfig = writeDefaultconfig
const writeGameconfig = (game) => {
  const {
    wineVersion,
    winePrefix,
    otherOptions,
    useGameMode,
    showFps,
  } = JSON.parse(fs_1.readFileSync(heroicConfigPath)).defaultSettings
  // @ts-ignore
  const { account_id } = JSON.parse(fs_1.readFileSync(userInfo))
  const config = {
    [game]: {
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      showFps,
      userInfo: {
        name: os_1.userInfo,
        epicId: account_id,
      },
    },
  }
  if (!fs_1.existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    fs_1.writeFileSync(
      `${heroicGamesConfigPath}${game}.json`,
      JSON.stringify(config, null, 2),
      //@ts-ignore
      () => 'done'
    )
  }
}
exports.writeGameconfig = writeGameconfig
function checkForUpdates() {
  return __awaiter(this, void 0, void 0, function* () {
    const {
      data: { tag_name },
    } = yield axios.default.get(
      'https://api.github.com/repos/flavioislima/HeroicGamesLauncher/releases/latest'
    )
    const newVersion = tag_name.replace('v', '').replaceAll('.', '')
    const currentVersion = electron_1.app.getVersion().replaceAll('.', '')
    if (newVersion > currentVersion) {
      const { response } = yield showMessageBox({
        title: 'Update Available',
        message:
          'There is a new version of Heroic Available, do you want to update now?',
        buttons: ['YES', 'NO'],
      })
      if (response === 0) {
        return child_process_1.exec(`xdg-open ${heroicGithubURL}`)
      }
      return
    }
  })
}
exports.checkForUpdates = checkForUpdates
function getLatestDxvk() {
  return __awaiter(this, void 0, void 0, function* () {
    const {
      data: { assets },
    } = yield axios.default.get(
      'https://api.github.com/repos/lutris/dxvk/releases/latest'
    )
    const current = assets[0]
    const pkg = current.name
    const name = pkg.replace('.tar.gz', '')
    const downloadUrl = current.browser_download_url
    const dxvkLatest = `${heroicToolsPath}/DXVK/${pkg}`
    const pastVersionCheck = `${heroicToolsPath}/DXVK/latest_dxvk`
    let pastVersion = ''
    if (fs_1.existsSync(pastVersionCheck)) {
      pastVersion = fs_1
        .readFileSync(pastVersionCheck)
        .toString()
        .split('\n')[0]
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
      .then(() =>
        __awaiter(this, void 0, void 0, function* () {
          console.log('downloaded DXVK')
          console.log('extracting DXVK')
          child_process_1.exec(echoCommand)
          yield execAsync(extractCommand)
          console.log('DXVK updated!')
          child_process_1.exec(cleanCommand)
        })
      )
      .catch(() => console.log('Error when downloading DXVK'))
  })
}
exports.getLatestDxvk = getLatestDxvk
function installDxvk(prefix) {
  return __awaiter(this, void 0, void 0, function* () {
    if (!prefix) {
      return
    }
    const winePrefix = prefix.replace('~', home)
    console.log({ prefix, winePrefix })
    if (!fs_1.existsSync(`${heroicToolsPath}/DXVK/latest_dxvk`)) {
      console.log('dxvk not found!')
      yield getLatestDxvk()
    }
    const globalVersion = fs_1
      .readFileSync(`${heroicToolsPath}/DXVK/latest_dxvk`)
      .toString()
      .split('\n')[0]
    const dxvkPath = `${heroicToolsPath}/DXVK/${globalVersion}/`
    const currentVersionCheck = `${winePrefix.replaceAll("'", '')}/current_dxvk`
    let currentVersion = ''
    if (fs_1.existsSync(currentVersionCheck)) {
      currentVersion = fs_1
        .readFileSync(currentVersionCheck)
        .toString()
        .split('\n')[0]
    }
    if (currentVersion === globalVersion) {
      return
    }
    const installCommand = `WINEPREFIX=${winePrefix} bash ${dxvkPath}setup_dxvk.sh install`
    const echoCommand = `echo '${globalVersion}' > ${currentVersionCheck}`
    console.log(`installing DXVK on ${winePrefix}`, installCommand)
    yield execAsync(`WINEPREFIX=${winePrefix} wineboot`)
    yield execAsync(installCommand, { shell: '/bin/bash' }).then(() =>
      child_process_1.exec(echoCommand)
    )
  })
}
exports.installDxvk = installDxvk
const showAboutWindow = () => {
  electron_1.app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    copyright: 'GPL V3',
    applicationVersion: `${electron_1.app.getVersion()} Doflamingo`,
    website: 'https://github.com/flavioislima/HeroicGamesLauncher',
    iconPath: icon,
  })
  return electron_1.app.showAboutPanel()
}
exports.showAboutWindow = showAboutWindow
const handleExit = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (fs_1.existsSync(`${heroicGamesConfigPath}/lock`)) {
      const { response } = yield showMessageBox({
        title: 'Exit',
        message: 'There are pending operations, are you sure?',
        buttons: ['NO', 'YES'],
      })
      if (response === 0) {
        return
      }
      return electron_1.app.exit()
    }
    electron_1.app.exit()
  })
exports.handleExit = handleExit
