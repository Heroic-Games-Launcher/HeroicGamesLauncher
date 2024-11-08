import { GlobalConfig } from 'backend/config'
import {
  configPath,
  defaultUmuPath,
  getSteamLibraries,
  toolsPath,
  userHome
} from 'backend/constants'
import { logError, LogPrefix, logInfo } from 'backend/logger/logger'
import { execAsync } from 'backend/utils'
import { execSync } from 'child_process'
import { WineInstallation } from 'common/types'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'graceful-fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { PlistObject, parse as plistParse } from 'plist'
import LaunchCommand from '../storeManagers/legendary/commands/launch'
import { NonEmptyString } from '../storeManagers/legendary/commands/base'
import { Path } from 'backend/schemas'
import { searchForExecutableOnPath } from './os/path'

/**
 * Loads the default wine installation path and version.
 *
 * @returns Promise<WineInstallation>
 */
export function getDefaultWine(): WineInstallation {
  const defaultWine: WineInstallation = {
    bin: '',
    name: 'Default Wine - Not Found',
    type: 'wine'
  }

  try {
    let stdout = execSync(`which wine`).toString()
    const wineBin = stdout.split('\n')[0]
    defaultWine.bin = wineBin

    stdout = execSync(`wine --version`).toString()
    const version = stdout.split('\n')[0]
    defaultWine.name = `Wine Default - ${version}`

    return {
      ...defaultWine,
      ...getWineExecs(wineBin)
    }
  } catch {
    return defaultWine
  }
}

function getCustomWinePaths(): Set<WineInstallation> {
  const customPaths = new Set<WineInstallation>()
  // skips this on new installations to avoid infinite loops
  if (existsSync(configPath)) {
    const { customWinePaths = [] } = GlobalConfig.get().getSettings()
    customWinePaths.forEach((path: string) => {
      if (path.endsWith('proton')) {
        return customPaths.add({
          bin: path,
          name: `Custom Proton - ${path}`,
          type: 'proton'
        })
      }
      return customPaths.add({
        bin: path,
        name: `Custom Wine - ${path}`,
        type: 'wine',
        ...getWineExecs(path)
      })
    })
  }
  return customPaths
}

/**
 * Checks if a Wine version has the Wineserver executable and returns the path to it if it's present
 * @param wineBin The unquoted path to the Wine binary ('wine')
 * @returns The quoted path to wineserver, if present
 */
export function getWineExecs(wineBin: string): { wineserver: string } {
  const wineDir = dirname(wineBin)
  const ret = { wineserver: '' }
  const potWineserverPath = join(wineDir, 'wineserver')
  if (existsSync(potWineserverPath)) {
    ret.wineserver = potWineserverPath
  }
  return ret
}

/**
 * Checks if a Wine version has lib/lib32 folders and returns the path to those if they're present
 * @param wineBin The unquoted path to the Wine binary ('wine')
 * @returns The paths to lib and lib32, if present
 */
export function getWineLibs(wineBin: string): {
  lib: string
  lib32: string
} {
  const wineDir = dirname(wineBin)
  const ret = { lib: '', lib32: '' }
  const potLib32Path = join(wineDir, '../lib')
  if (existsSync(potLib32Path)) {
    ret.lib32 = potLib32Path
  }
  const potLibPath = join(wineDir, '../lib64')
  if (existsSync(potLibPath)) {
    ret.lib = potLibPath
  }
  return ret
}

export async function getLinuxWineSet(
  scanCustom?: boolean
): Promise<Set<WineInstallation>> {
  if (!existsSync(`${toolsPath}/wine`)) {
    mkdirSync(`${toolsPath}/wine`, { recursive: true })
  }

  if (!existsSync(`${toolsPath}/proton`)) {
    mkdirSync(`${toolsPath}/proton`, { recursive: true })
  }

  const altWine = new Set<WineInstallation>()

  readdirSync(`${toolsPath}/wine/`).forEach((version) => {
    const wineBin = join(toolsPath, 'wine', version, 'bin', 'wine')
    altWine.add({
      bin: wineBin,
      name: `Wine - ${version}`,
      type: 'wine',
      ...getWineLibs(wineBin),
      ...getWineExecs(wineBin)
    })
  })

  const lutrisPath = `${homedir()}/.local/share/lutris`
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`

  if (existsSync(lutrisCompatPath)) {
    readdirSync(lutrisCompatPath).forEach((version) => {
      const wineBin = join(lutrisCompatPath, version, 'bin', 'wine')
      altWine.add({
        bin: wineBin,
        name: `Wine - ${version}`,
        type: 'wine',
        ...getWineLibs(wineBin),
        ...getWineExecs(wineBin)
      })
    })
  }

  const protonPaths = [`${toolsPath}/proton/`]

  await getSteamLibraries().then((libs) => {
    libs.forEach((path) => {
      protonPaths.push(`${path}/steam/steamapps/common`)
      protonPaths.push(`${path}/steamapps/common`)
      protonPaths.push(`${path}/root/compatibilitytools.d`)
      protonPaths.push(`${path}/compatibilitytools.d`)
      return
    })
  })

  const proton = new Set<WineInstallation>()

  protonPaths.forEach((path) => {
    if (existsSync(path)) {
      readdirSync(path).forEach((version) => {
        // Only relevant to Lutris
        if (version.startsWith('UMU-Latest')) {
          return
        }
        const protonBin = join(path, version, 'proton')
        // check if bin exists to avoid false positives
        if (existsSync(protonBin)) {
          proton.add({
            bin: protonBin,
            name: `Proton - ${version}`,
            type: 'proton'
            // No need to run this.getWineExecs here since Proton ships neither Wineboot nor Wineserver
          })
        }
      })
    }
  })

  const defaultWineSet = new Set<WineInstallation>()
  const defaultWine = getDefaultWine()
  if (!defaultWine.name.includes('Not Found')) {
    defaultWineSet.add(defaultWine)
  }

  let customWineSet = new Set<WineInstallation>()
  if (scanCustom) {
    customWineSet = getCustomWinePaths()
  }

  return new Set([...defaultWineSet, ...altWine, ...proton, ...customWineSet])
}

/// --------------- MACOS ------------------

/**
 * Detects Wine installed on home application folder on Mac
 *
 * @returns Promise<Set<WineInstallation>>
 */
export async function getWineOnMac(): Promise<Set<WineInstallation>> {
  const wineSet = new Set<WineInstallation>()
  if (!isMac) {
    return wineSet
  }

  const winePaths = new Set<string>()

  // search for wine installed on $HOME/Library/Application Support/heroic/tools/wine
  const wineToolsPath = `${toolsPath}/wine/`
  if (existsSync(wineToolsPath)) {
    readdirSync(wineToolsPath).forEach((path) => {
      winePaths.add(join(wineToolsPath, path))
    })
  }

  // search for wine installed around the system
  await execAsync('mdfind kMDItemCFBundleIdentifier = "*.wine"').then(
    async ({ stdout }) => {
      stdout.split('\n').forEach((winePath) => {
        winePaths.add(winePath)
      })
    }
  )

  winePaths.forEach((winePath) => {
    const infoFilePath = join(winePath, 'Contents/Info.plist')
    if (winePath && existsSync(infoFilePath)) {
      const info = plistParse(
        readFileSync(infoFilePath, 'utf-8')
      ) as PlistObject
      const version = info['CFBundleShortVersionString'] || ''
      const name = info['CFBundleName'] || ''
      const wineBin = join(winePath, '/Contents/Resources/wine/bin/wine64')
      if (existsSync(wineBin)) {
        wineSet.add({
          ...getWineExecs(wineBin),
          lib: `${winePath}/Contents/Resources/wine/lib`,
          lib32: `${winePath}/Contents/Resources/wine/lib`,
          bin: wineBin,
          name: `${name} - ${version}`,
          type: 'wine',
          ...getWineExecs(wineBin)
        })
      }
    }
  })

  return wineSet
}

export async function getWineskinWine(): Promise<Set<WineInstallation>> {
  const wineSet = new Set<WineInstallation>()
  if (!isMac) {
    return wineSet
  }
  const wineSkinPath = `${userHome}/Applications/Wineskin`
  if (existsSync(wineSkinPath)) {
    const apps = readdirSync(wineSkinPath)
    for (const app of apps) {
      if (app.includes('.app')) {
        const wineBin = `${userHome}/Applications/Wineskin/${app}/Contents/SharedSupport/wine/bin/wine64`
        if (existsSync(wineBin)) {
          try {
            const { stdout: out } = await execAsync(`'${wineBin}' --version`)
            const version = out.split('\n')[0]
            wineSet.add({
              ...getWineExecs(wineBin),
              lib: `${userHome}/Applications/Wineskin/${app}/Contents/SharedSupport/wine/lib`,
              lib32: `${userHome}/Applications/Wineskin/${app}/Contents/SharedSupport/wine/lib`,
              name: `Wineskin - ${version}`,
              type: 'wine',
              bin: wineBin
            })
          } catch (error) {
            logError(
              `Error getting wine version for ${wineBin}`,
              LogPrefix.GlobalConfig
            )
          }
        }
      }
    }
  }
  return wineSet
}

/**
 * Detects CrossOver installs on Mac
 *
 * @returns Promise<Set<WineInstallation>>
 */
export async function getCrossover(): Promise<Set<WineInstallation>> {
  const crossover = new Set<WineInstallation>()

  if (!isMac) {
    return crossover
  }

  await execAsync(
    'mdfind kMDItemCFBundleIdentifier = "com.codeweavers.CrossOver"'
  )
    .then(async ({ stdout }) => {
      stdout.split('\n').forEach((crossoverMacPath) => {
        const infoFilePath = join(crossoverMacPath, 'Contents/Info.plist')
        if (crossoverMacPath && existsSync(infoFilePath)) {
          const info = plistParse(
            readFileSync(infoFilePath, 'utf-8')
          ) as PlistObject
          const version = info['CFBundleShortVersionString'] || ''
          const crossoverWineBin = join(
            crossoverMacPath,
            'Contents/SharedSupport/CrossOver/bin/wine'
          )
          crossover.add({
            bin: crossoverWineBin,
            name: `CrossOver - ${version}`,
            type: 'crossover',
            ...getWineExecs(crossoverWineBin)
          })
        }
      })
    })
    .catch(() => {
      logInfo('CrossOver not found', LogPrefix.GlobalConfig)
    })
  return crossover
}

/**
 * Detects Gaming Porting Toolkit Wine installs on Mac
 * @returns Promise<Set<WineInstallation>>
 **/
export async function getGamePortingToolkitWine(): Promise<
  Set<WineInstallation>
> {
  const gamePortingToolkitWine = new Set<WineInstallation>()
  if (!isMac) {
    return gamePortingToolkitWine
  }

  const GPTK_ToolPath = join(toolsPath, 'game-porting-toolkit')
  const wineGPTKPaths = new Set<string>()

  if (existsSync(GPTK_ToolPath)) {
    readdirSync(GPTK_ToolPath).forEach((path) => {
      wineGPTKPaths.add(join(GPTK_ToolPath, path))
    })
  }

  wineGPTKPaths.forEach((winePath) => {
    const infoFilePath = join(winePath, 'Contents/Info.plist')
    if (existsSync(infoFilePath)) {
      const wineBin = join(winePath, '/Contents/Resources/wine/bin/wine64')
      try {
        const name = winePath.split('/').pop() || ''
        if (existsSync(wineBin)) {
          gamePortingToolkitWine.add({
            ...getWineExecs(wineBin),
            lib: `${winePath}/Contents/Resources/wine/lib`,
            lib32: `${winePath}/Contents/Resources/wine/lib`,
            bin: wineBin,
            name,
            type: 'toolkit',
            ...getWineExecs(wineBin)
          })
        }
      } catch (error) {
        logError(
          `Error getting wine version for GPTK ${wineBin}`,
          LogPrefix.GlobalConfig
        )
      }
    }
  })

  return gamePortingToolkitWine
}

/**
 * Detects Gaming Porting Toolkit Wine installs on Mac
 * @returns Promise<Set<WineInstallation>>
 **/
export async function getSystemGamePortingToolkitWine(): Promise<
  Set<WineInstallation>
> {
  const systemGPTK = new Set<WineInstallation>()
  if (!isMac) {
    return systemGPTK
  }

  logInfo('Searching for Gaming Porting Toolkit Wine', LogPrefix.GlobalConfig)
  const { stdout } = await execAsync('mdfind wine64')
  const wineBin = stdout.split('\n').filter((p) => {
    return p.match(/game-porting-toolkit.*\/wine64$/)
  })[0]

  if (existsSync(wineBin)) {
    logInfo(
      `Found Game Porting Toolkit Wine at ${dirname(wineBin)}`,
      LogPrefix.GlobalConfig
    )
    try {
      const { stdout: out } = await execAsync(`'${wineBin}' --version`)
      const version = out.split('\n')[0]
      const GPTKDIR = join(dirname(wineBin), '..')
      systemGPTK.add({
        ...getWineExecs(wineBin),
        name: `GPTK System (DX11/DX12 Only) - ${version}`,
        type: 'toolkit',
        lib: join(GPTKDIR, 'lib'),
        lib32: join(GPTKDIR, 'lib'),
        bin: wineBin
      })
    } catch (error) {
      logError(
        `Error getting wine version for ${wineBin}`,
        LogPrefix.GlobalConfig
      )
    }
  }

  return systemGPTK
}

/**
 * Detects Whisky installs on Mac
 *
 * @returns Promise<Set<WineInstallation>>
 */
export async function getWhisky(): Promise<Set<WineInstallation>> {
  const whisky = new Set<WineInstallation>()

  if (!isMac) {
    return whisky
  }

  await execAsync(
    'mdfind kMDItemCFBundleIdentifier = "com.isaacmarovitz.Whisky"'
  ).then(async ({ stdout }) => {
    stdout.split('\n').forEach((whiskyMacPath) => {
      const infoFilePath = join(whiskyMacPath, 'Contents/Info.plist')
      if (whiskyMacPath && existsSync(infoFilePath)) {
        const info = plistParse(
          readFileSync(infoFilePath, 'utf-8')
        ) as PlistObject
        const version = info['CFBundleShortVersionString'] || ''
        const whiskyWineBin = `${userHome}/Library/Application Support/com.isaacmarovitz.Whisky/Libraries/Wine/bin/wine64`

        whisky.add({
          bin: whiskyWineBin,
          name: `Whisky - ${version}`,
          type: `toolkit`,
          lib: `${dirname(whiskyWineBin)}/../lib`,
          lib32: `${dirname(whiskyWineBin)}/../lib`,
          ...getWineExecs(whiskyWineBin)
        })
      }
    })
  })

  return whisky
}

export type AllowedWineFlags = Pick<
  LaunchCommand,
  '--wine' | '--wrapper' | '--no-wine'
>

/**
 * Returns a LegendaryCommand with the required flags to use a specified Wine version
 * @param wineBin The full path to the Wine binary (`wine`/`wine64`/`proton`)
 * @param wineType The type of the Wine version
 * @param wrapper Any wrappers to be used, may be `''`
 */
export async function getWineFlags(
  wineBin: string,
  wineType: WineInstallation['type'],
  wrapper: string
): Promise<AllowedWineFlags> {
  let partialCommand: AllowedWineFlags = {}
  const umuSupported = await isUmuSupported(wineType)
  switch (wineType) {
    case 'wine':
    case 'toolkit':
      partialCommand = { '--wine': Path.parse(wineBin) }
      if (wrapper) partialCommand['--wrapper'] = NonEmptyString.parse(wrapper)
      break
    case 'proton':
      partialCommand = {
        '--no-wine': true,
        '--wrapper': NonEmptyString.parse(
          `${wrapper} "${wineBin}" waitforexitandrun`
        )
      }
      if (umuSupported) {
        partialCommand['--wrapper'] = NonEmptyString.parse(
          (wrapper ? `${wrapper} ` : '') + `"${await getUmuPath()}"`
        )
      }
      break
    case 'crossover':
      partialCommand = {
        '--wine': Path.parse(wineBin)
      }
      if (wrapper) partialCommand['--wrapper'] = NonEmptyString.parse(wrapper)
      break
    default:
      break
  }
  return partialCommand
}

/**
 * Like {@link getWineFlags}, but returns a `string[]` with the flags instead
 */
export async function getWineFlagsArray(
  wineBin: string,
  wineType: WineInstallation['type'],
  wrapper: string
): Promise<string[]> {
  const partialCommand = await getWineFlags(wineBin, wineType, wrapper)

  const commandArray: string[] = []
  for (const [key, value] of Object.entries(partialCommand)) {
    if (value === true) commandArray.push(key)
    else commandArray.push(key, value)
  }
  return commandArray
}

export const getUmuPath = async () =>
  searchForExecutableOnPath('umu-run').then((path) => path ?? defaultUmuPath)

export async function isUmuSupported(
  wineType: WineInstallation['type'],
  checkUmuInstalled = true
): Promise<boolean> {
  const umuEnabled =
    GlobalConfig.get().getSettings().experimentalFeatures?.umuSupport === true
  const wineVersionSupported = wineType === 'proton'
  const umuInstalled = checkUmuInstalled ? existsSync(await getUmuPath()) : true

  return umuEnabled && wineVersionSupported && umuInstalled
}
