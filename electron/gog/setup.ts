import axios from 'axios'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  constants,
  writeFileSync
} from 'graceful-fs'
import path from 'node:path'
import { GOGLibrary } from './library'
import { GameInfo } from '../types'
import { execAsync } from '../utils'
import { GameConfig } from '../game_config'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { home, isWindows } from '../constants'
import ini from 'ini'
/**
 * Handles setup instructions like create folders, move files, run exe, create registry entry etc...
 * For Galaxy games only (Mac and Windows for now)
 * @param appName
 */
async function setup(appName: string): Promise<void> {
  const gameInfo = GOGLibrary.get().getGameInfo(appName)
  if (!gameInfo || gameInfo.install.platform == 'linux') {
    return
  }
  const instructions = await obtainSetupInstructions(gameInfo)
  if (!instructions) {
    return
  }
  logWarning(
    'Running setup instructions, if you notice issues with launching a game, please report it on our Discord server',
    LogPrefix.Gog
  )

  const gameSettings = GameConfig.get(appName).config

  const isCrossover = gameSettings.wineVersion.type === 'crossover'
  const crossoverBottle = gameSettings.wineCrossoverBottle
  const crossoverEnv =
    isCrossover && crossoverBottle ? `CX_BOTTLE=${crossoverBottle}` : ''
  const isProton = gameSettings.wineVersion.type === 'proton'
  const prefix = isProton
    ? `STEAM_COMPAT_CLIENT_INSTALL_PATH=${home}/.steam/steam STEAM_COMPAT_DATA_PATH='${gameSettings.winePrefix
        .replaceAll("'", '')
        .replace('~', home)}'`
    : `WINEPREFIX="${gameSettings.winePrefix
        .replaceAll("'", '')
        .replace('~', home)}"`

  const commandPrefix = isWindows
    ? ''
    : `${isCrossover ? crossoverEnv : prefix} ${gameSettings.wineVersion.bin}`
  // Funny part begins here

  // Deterimine if it's basicly from .script file or from manifest
  if (instructions[0]?.install) {
    // It's from .script file
    // Parse actions
    for (const action of instructions) {
      const actionArguments = action.install?.arguments
      switch (action.install.action) {
        case 'setRegistry': {
          const registryPath =
            actionArguments.root + '\\' + actionArguments.subkey
          // If deleteSubkeys is true remove path first
          if (actionArguments.deleteSubkeys) {
            const command = `${commandPrefix} reg delete "${registryPath}" /f`
            logInfo(
              ['Setup: Deleting a registry key', registryPath],
              LogPrefix.Gog
            )
            await execAsync(command)
          }
          // Now create a key
          const command = `${commandPrefix} reg add "${registryPath}" /f`
          logInfo(['Setup: Adding a registry key', registryPath], LogPrefix.Gog)
          await execAsync(command)
          break
        }
        case 'Execute': {
          const executableName = actionArguments.executable
          const infoPath = path.join(
            gameInfo.install.install_path,
            `goggame-${appName}.info`
          )
          let Language = 'english'
          // Load game language data
          if (existsSync(infoPath)) {
            const contents = readFileSync(infoPath, 'utf-8')
            Language = JSON.parse(contents).language
            Language = Language.toLowerCase()
          }

          // Please don't fix any typos here, everything is intended
          const exeArguments = `/VERYSILENT /DIR="${!isWindows ? 'Z:' : ''}${
            gameInfo.install.install_path
          }" /Language=${Language} /LANG=${Language} /ProductId=${appName} /galaxyclient /buildId=${
            gameInfo.install.buildId
          } /versionName="${
            gameInfo.install.version
          }" /nodesktopshorctut /nodesktopshortcut`
          const workingDir = actionArguments?.workingDir?.replace(
            '%SUPPORT%',
            `"${path.join(gameInfo.install.install_path, 'support', appName)}"`
          )
          const executablePath = path.join(
            gameInfo.install.install_path,
            'support',
            appName,
            executableName
          )
          if (!existsSync(executablePath)) {
            logError(
              ['Executable', executablePath, "doesn't exsist"],
              LogPrefix.Gog
            )
            break
          }
          let command = `${
            workingDir ? 'cd ' + workingDir + ' &&' : ''
          } ${commandPrefix} "${executablePath}" ${exeArguments}`
          // Requires testing
          if (isWindows) {
            command = `${
              workingDir ? 'cd ' + workingDir + ' &&' : ''
            } Start-Process -FilePath "${executablePath}" -Verb RunAs -ArgumentList "${exeArguments}"`
          }
          logInfo(['Setup: Executing', command], LogPrefix.Gog)
          await execAsync(command)
          break
        }
        case 'supportData': {
          const targetPath = actionArguments.target.replace(
            '{app}',
            gameInfo.install.install_path
          )
          const type = actionArguments.type
          if (type == 'folder') {
            mkdirSync(targetPath, { recursive: true })
          } else if (type == 'file') {
            const sourcePath = actionArguments.source
              .replace(
                '{supportDir}',
                path.join(gameInfo.install.install_path, 'support', appName)
              )
              .replace('{app}', gameInfo.install.install_path)
            if (existsSync(sourcePath)) {
              copyFileSync(sourcePath, targetPath, constants.COPYFILE_FICLONE)
            }
          } else {
            logError(
              ['Setup: Unsupported supportData type:', type],
              LogPrefix.Gog
            )
          }
          break
        }
        case 'setIni': {
          const filePath = actionArguments?.filename.replace(
            '{app}',
            gameInfo.install.install_path
          )
          if (!filePath || !existsSync(filePath)) {
            logError("Setup: setIni file doesn't exists", LogPrefix.Gog)
            break
          }
          const encoding = actionArguments?.utf8 ? 'utf-8' : 'ascii'
          const fileData = readFileSync(filePath, {
            encoding
          })
          const config = ini.parse(fileData)
          // TODO: Do something
          const section = actionArguments?.section
          const keyName = actionArguments?.keyName
          if (!section || !keyName) {
            logError(
              "Missing section and key values, this message shouldn't appear for you. Please report it on our Discord or GitHub"
            )
            break
          }

          config[section][keyName] = actionArguments.keyValue.replace(
            '{app}',
            isWindows ? '' : 'Z:' + gameInfo.install.install_path
          )
          writeFileSync(filePath, ini.stringify(config), { encoding })
          break
        }
        default: {
          logError(
            [
              'Setup: Looks like you have found new setup instruction, please report it on our Discord or GitHub',
              `appName: ${appName}, action: ${action.install.action}`
            ],
            LogPrefix.Gog
          )
        }
      }
    }
  } else {
    // I's from V1 game manifest
    // Sample
    /*
      "support_commands": [
            {
                "languages": [
                    "Neutral"
                ],
                "executable": "/galaxy_akalabeth_2.0.0.1.exe",
                "gameID": "1207666073",
                "systems": [
                    "Windows"
                ],
                "argument": ""
            }
        ],
    */
  }
  logInfo('Setup: Finished', LogPrefix.Gog)
}

async function obtainSetupInstructions(gameInfo: GameInfo) {
  const { buildId, appName, install_path } = gameInfo.install

  const scriptPath = path.join(install_path, `goggame-${appName}.script`)
  if (existsSync(scriptPath)) {
    const data = readFileSync(scriptPath, { encoding: 'utf-8' })
    return JSON.parse(data).actions
  }
  // No .script is present, check for support_commands in repository.json of V1 games

  const buildResponse = await axios.get(
    `https://content-system.gog.com/products/${appName}/os/windows/builds`
  )
  const buildData = buildResponse.data
  const buildItem = buildData.items.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (value: any) => value.build_id == buildId
  )
  // Get data only if it's V1 depot game
  if (buildItem?.generation == 1) {
    const metaResponse = await axios.get(buildItem.link)
    metaResponse.data.support_commands
  }

  // TODO: find if there are V2 games with something like support_commands in manifest
  return null
}

export default setup
