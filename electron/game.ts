/* eslint-disable @typescript-eslint/ban-ts-comment */
import { dialog } from 'electron'
import { exec } from 'child_process'
import {
  existsSync,
  writeFile
} from 'graceful-fs'
import { promisify } from 'util'
import i18next from 'i18next'

import { DXVK } from './dxvk'
import { Library } from './library'
import {
  errorHandler,
  isOnline
} from './utils'
import { getSettings } from './config'
import {
  heroicGamesConfigPath,
  home,
  legendaryBin
} from './constants'

const execAsync = promisify(exec)

const { showErrorBox } = dialog

export class Game {
  public appName: string

  constructor(appName: string) {
    this.appName = appName
  }

  public getGameInfo() {
    Library.get().getGameInfo(this.appName)
  }

  public async getSettings() {
    return await getSettings(this.appName)
  }

  public async update() {
    if (!(await isOnline())) {
      console.log(`App offline, skipping update for game '${this.appName}'.`)
      return
    }
    const logPath = `${heroicGamesConfigPath}${this.appName}.log`
    const command = `${legendaryBin} update ${this.appName} -y &> ${logPath}`

    try {
      await execAsync(command, { shell: '/bin/bash' })
    } catch (error) {
      return errorHandler(logPath)
    }
  }

  public async launch() {
    let envVars = ''
    let gameMode: string

    const {
      winePrefix,
      wineVersion,
      otherOptions,
      useGameMode,
      showFps,
      launcherArgs = '',
      showMangohud,
      audioFix,
      autoInstallDxvk
    } = await getSettings(this.appName)

    const fixedWinePrefix = winePrefix.replace('~', home)
    let wineCommand = `--wine ${wineVersion.bin}`

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
      showMangohud: showMangohud ? `MANGOHUD=1` : ''
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
      await DXVK.install(winePrefix)
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

    const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${this.appName}  ${wineCommand} ${prefix} ${launcherArgs}`
    console.log('\n Launch Command:', command)

    return execAsync(command)
      .then(({ stderr }) => {
        writeFile(
          `${heroicGamesConfigPath}${this.appName}-lastPlay.log`,
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
          `${heroicGamesConfigPath}${this.appName}-lastPlay.log`,
          stderr,
          () => 'done'
        )
        return stderr
      })
  }
}

export interface GameInfo {
  app_name: string,
  art_cover: string | null,
  art_logo: string | null,
  art_square: string,
  cloudSaveEnabled: boolean,
  description: string,
  developer: string,
  executable: string,
  extraInfo: [],
  folderName: string,
  info: unknown,
  install_path: string,
  install_size: string,
  isInstalled: boolean,
  is_dlc: boolean,
  namespace: unknown,
  saveFolder: string,
  title: string,
  version: string
}
