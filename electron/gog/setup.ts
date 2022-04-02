import axios from 'axios'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'graceful-fs'
import { copySync } from 'fs-extra'
import path from 'node:path'
import { GOGLibrary } from './library'
import { GameInfo } from '../types'
import { execAsync, isOnline } from '../utils'
import { GameConfig } from '../game_config'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { userHome, isWindows, steamCompatFolder } from '../constants'
import ini from 'ini'
/**
 * Handles setup instructions like create folders, move files, run exe, create registry entry etc...
 * For Galaxy games only (Windows)
 * This relies on root file system mounted at Z: in prefixes (We need better approach to access game path from prefix)
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
    ? `STEAM_COMPAT_CLIENT_INSTALL_PATH=${steamCompatFolder} STEAM_COMPAT_DATA_PATH='${gameSettings.winePrefix
        .replaceAll("'", '')
        .replace('~', userHome)}'`
    : `WINEPREFIX="${gameSettings.winePrefix
        .replaceAll("'", '')
        .replace('~', userHome)}"`

  const commandPrefix = isWindows
    ? ''
    : `${isCrossover ? crossoverEnv : prefix} ${gameSettings.wineVersion.bin} ${
        isProton ? 'runinprefix' : ''
      }`
  // Make sure Proton initialized prefix correctly
  if (isProton) {
    await execAsync(
      `${prefix} ${gameSettings.wineVersion.bin} run reg /?` // This is a help command for reg, it's enough to initialize a prefix
    ).catch()
  }
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
            actionArguments.root +
            '\\' +
            actionArguments.subkey.replace('{productID}', appName)
          let valueData = actionArguments?.valueData?.replace(
            '{app}',
            `${!isWindows ? 'Z:' : ''}${gameInfo.install.install_path}`
          )
          const valueName = actionArguments?.valueName
          const valueType = actionArguments?.valueType

          let keyCommand = ''
          if (valueData && valueName) {
            const regType = getRegDataType(valueType)
            if (!regType) {
              logError(
                `Setup: Unsupported registry type ${valueType}, skipping this key`
              )
              break
            }
            if (valueType === 'binary') {
              valueData = Buffer.from(valueData, 'base64').toString('hex')
            }
            keyCommand = `/d "${valueData}" /v "${valueName}" /t ${regType}`
          }
          // Now create a key
          const command = `${commandPrefix} reg add "${registryPath}" ${keyCommand} /f`
          logInfo(
            [
              'Setup: Adding a registry key',
              registryPath,
              valueName,
              valueData
            ],
            LogPrefix.Gog
          )
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

          const supportPath = `"${path.join(
            gameInfo.install.install_path,
            'support',
            appName
          )}"`
          const workingDir = actionArguments?.workingDir
            ?.replace('%SUPPORT%', supportPath)
            .replace('{supportDir}', supportPath)
          const executablePath = path.join(
            gameInfo.install.install_path,
            executableName.replace(
              '{supportDir}',
              path.join('support', appName)
            )
          )
          if (!existsSync(executablePath)) {
            logError(
              ['Executable', executablePath, "doesn't exsist"],
              LogPrefix.Gog
            )
            break
          }
          let command = `${commandPrefix} "${executablePath}" ${exeArguments}`
          // Requires testing
          if (isWindows) {
            command = `Start-Process -FilePath "${executablePath}" -Verb RunAs -ArgumentList "${exeArguments}"`
          }
          logInfo(['Setup: Executing', command], LogPrefix.Gog)
          await execAsync(command, { cwd: workingDir })
          break
        }
        case 'supportData': {
          const targetPath = actionArguments.target.replace(
            '{app}',
            gameInfo.install.install_path
          )
          const type = actionArguments.type
          const sourcePath = actionArguments?.source
            ?.replace(
              '{supportDir}',
              path.join(gameInfo.install.install_path, 'support', appName)
            )
            ?.replace('{app}', gameInfo.install.install_path)
          if (type == 'folder') {
            if (!actionArguments?.source) {
              logInfo(['Setup: Creating directory', targetPath], LogPrefix.Gog)
              mkdirSync(targetPath, { recursive: true })
            } else {
              logInfo(
                ['Setup: Copying directory', sourcePath, 'to', targetPath],
                LogPrefix.Gog
              )
              copySync(sourcePath, targetPath, {
                overwrite: actionArguments?.overwrite,
                recursive: true
              })
            }
          } else if (type == 'file') {
            if (sourcePath && existsSync(sourcePath)) {
              logInfo(
                ['Setup: Copying file', sourcePath, 'to', targetPath],
                LogPrefix.Gog
              )
              copyFileSync(sourcePath, targetPath)
            } else {
              logWarning(
                ['Setup: sourcePath:', sourcePath, 'does not exist.'],
                LogPrefix.Gog
              )
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
    //TODO
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
  if (!isOnline()) {
    logWarning(
      "Setup: App is offline, couldn't check if there are any support_commands in manifest",
      LogPrefix.Gog
    )
    return null
  }
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
    return metaResponse.data?.support_commands
  }

  // TODO: find if there are V2 games with something like support_commands in manifest
  return null
}

const registryDataTypes = new Map([
  ['string', 'REG_SZ'],
  ['dword', 'REG_DWORD'],
  ['binary', 'REG_BINARY']
  // If needed please add those values REG_NONE REG_EXPAND_SZ REG_MULTI_SZ
])
const getRegDataType = (dataType: string): string =>
  registryDataTypes.get(dataType.toLowerCase())

export default setup
