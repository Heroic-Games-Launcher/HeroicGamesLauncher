import { GlobalConfig } from 'backend/config'
import { logError, LogPrefix, logInfo } from 'backend/logger'
import { execAsync, getSteamLibraries } from 'backend/utils'
import { execSync } from 'child_process'
import { GameSettings, WineInstallation } from 'common/types'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'graceful-fs'
import { homedir } from 'os'
import { basename, dirname, isAbsolute, join } from 'path'
import { PlistObject, parse as plistParse } from 'plist'
import { parse as parseVdf } from '@node-steam/vdf'
import LaunchCommand from '../storeManagers/legendary/commands/launch'
import { NonEmptyString } from '../storeManagers/legendary/commands/base'
import { Path } from 'backend/schemas'
import { searchForExecutableOnPath } from './os/path'
import {
  configPath,
  defaultUmuPath,
  toolsPath,
  userHome
} from 'backend/constants/paths'
import { isLinux, isMac } from 'backend/constants/environment'
import { globSync } from 'node:fs'
import { z } from 'zod'

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
    defaultWine.name = stdout.split('\n')[0]

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

/**
 * Zod schema for VDF Proton compatibility tool structure
 */
const ProtonVdfSchema = z.object({
  compatibilitytools: z.object({
    compat_tools: z.record(
      z.object({
        install_path: z.string().min(1),
        display_name: z.string().optional()
      })
    )
  })
})

/**
 * Parses a VDF file to extract Proton compatibility tool information
 * @param vdfPath Absolute path to the VDF file
 * @param itemName The name of the item (directory or VDF file)
 * @param itemDir The directory containing the VDF file
 * @returns WineInstallation object if valid proton installation found, null otherwise
 */
function parseProtonVdfFile(
  vdfPath: string,
  itemName: string,
  itemDir: string
): WineInstallation | null {
  let vdfContent: string
  try {
    vdfContent = readFileSync(vdfPath, 'utf-8')
  } catch (error) {
    logError(
      [`Failed to read VDF file ${basename(vdfPath)}:`, error],
      LogPrefix.GlobalConfig
    )
    return null
  }

  let parsedVdf: unknown
  try {
    parsedVdf = parseVdf(vdfContent)
  } catch (error) {
    logError(
      [`Failed to parse VDF file ${basename(vdfPath)}:`, error],
      LogPrefix.GlobalConfig
    )
    return null
  }

  // Validate VDF structure using Zod schema
  const validationResult = ProtonVdfSchema.safeParse(parsedVdf)
  if (!validationResult.success) {
    logError(
      [
        `Malformed VDF file ${basename(vdfPath)}: schema validation failed`,
        validationResult.error
      ],
      LogPrefix.GlobalConfig
    )
    return null
  }

  const vdfData = validationResult.data
  const tools = vdfData.compatibilitytools.compat_tools
  const toolKeys = Object.keys(tools)

  if (toolKeys.length === 0) {
    logError(
      [`No compatibility tools found in VDF file ${basename(vdfPath)}`],
      LogPrefix.GlobalConfig
    )
    return null
  }

  const firstTool = tools[toolKeys[0]]
  const installPath = firstTool.install_path
  const displayName = firstTool.display_name || itemName

  // Determine proton binary path
  // install_path can be absolute (e.g., "/opt/proton-cachyos") or relative
  const protonBin = isAbsolute(installPath)
    ? join(installPath, 'proton')
    : join(itemDir, installPath, 'proton')

  // Only return if the proton binary actually exists
  if (!existsSync(protonBin)) {
    logError(
      [`Proton binary not found at ${protonBin} for ${displayName}`],
      LogPrefix.GlobalConfig
    )
    return null
  }

  return {
    bin: protonBin,
    name: displayName,
    type: 'proton'
  }
}

/**
 * Scans a single directory for Proton installations
 * @param path The directory path to scan
 * @returns Set of WineInstallation objects found in the directory
 */
function scanProtonPath(path: string): Set<WineInstallation> {
  if (!existsSync(path)) return new Set()

  try {
    // Get installations from VDF files
    const vdfPaths = globSync('{*.vdf,*/*.vdf}', {
      cwd: path
    }).filter((vdfPath) => !vdfPath.includes('UMU-Latest'))

    const vdfInstallations = vdfPaths
      .map((vdfPath) => {
        const absoluteVdfPath = join(path, vdfPath)
        const isDirectVdf = dirname(vdfPath) === '.'
        const itemDir = isDirectVdf ? path : join(path, dirname(vdfPath))
        const itemName = isDirectVdf
          ? basename(vdfPath, '.vdf')
          : basename(dirname(vdfPath))

        return parseProtonVdfFile(absoluteVdfPath, itemName, itemDir)
      })
      .filter(
        (installation): installation is WineInstallation =>
          installation !== null
      )

    // Track which directories were processed via VDF
    const processedDirs = new Set(
      vdfPaths
        .filter((vdfPath) => dirname(vdfPath) !== path)
        .map((vdfPath) => dirname(vdfPath))
    )

    // Fallback: get installations from proton binaries not covered by VDF files
    // The compatibility-tool code will have to be refactored once Valve starts packaging FEX alongside Proton
    const protonInstallations = globSync('*/proton', {
      cwd: path
    })
      .map((protonBin) => ({
        protonBin: join(path, protonBin),
        itemDir: dirname(protonBin),
        itemName: basename(dirname(protonBin))
      }))
      .filter(({ itemName }) => !itemName.startsWith('UMU-Latest'))
      .filter(({ itemDir }) => !processedDirs.has(itemDir))
      .map(({ protonBin, itemName }) => ({
        bin: protonBin,
        name: itemName,
        type: 'proton' as const
      }))

    return new Set([...vdfInstallations, ...protonInstallations])
  } catch (error) {
    logError([`Failed to scan path ${path}:`, error], LogPrefix.GlobalConfig)
    return new Set()
  }
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
      name: version,
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
        name: version,
        type: 'wine',
        ...getWineLibs(wineBin),
        ...getWineExecs(wineBin)
      })
    })
  }

  const protonPaths = [`${toolsPath}/proton/`]

  const { showValveProton } = GlobalConfig.get().getSettings()

  await getSteamLibraries().then((libs) => {
    libs.forEach((path) => {
      if (showValveProton) {
        protonPaths.push(`${path}/steam/steamapps/common`)
        protonPaths.push(`${path}/steamapps/common`)
      }
      protonPaths.push(`${path}/root/compatibilitytools.d`)
      protonPaths.push(`${path}/compatibilitytools.d`)
      return
    })
  })

  const proton = new Set<WineInstallation>()

  for (const path of protonPaths) {
    const pathInstallations = scanProtonPath(path)
    pathInstallations.forEach((installation) => proton.add(installation))
  }

  const defaultWineSet = new Set<WineInstallation>()
  const defaultWine = getDefaultWine()
  if (!defaultWine.name.includes('Not Found')) {
    defaultWineSet.add(defaultWine)
  }

  let customWineSet = new Set<WineInstallation>()
  if (scanCustom) {
    customWineSet = getCustomWinePaths()
  }

  return new Set([...proton, ...altWine, ...defaultWineSet, ...customWineSet])
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
      let wineBin = join(winePath, '/Contents/Resources/wine/bin/wine64')
      if (!existsSync(wineBin)) {
        // Fallback to wine if wine64 is not found
        wineBin = join(winePath, '/Contents/Resources/wine/bin/wine')
      }
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
              [`Error getting wine version for ${wineBin}:`, error],
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
          [`Error getting wine version for GPTK ${wineBin};`, error],
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
    return p.match(/^(?!.*heroic\/tools).*game-porting-toolkit.*\/wine64$/)
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
        [`Error getting wine version for ${wineBin}:`, error],
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

  const whiskyWinePath = join(
    userHome,
    'Library/Application Support/com.isaacmarovitz.Whisky/Libraries'
  )
  const whiskyVersionPlist = join(whiskyWinePath, 'WhiskyWineVersion.plist')
  const whiskyWineBin = join(whiskyWinePath, 'Wine/bin/wine64')

  if (existsSync(whiskyVersionPlist) && existsSync(whiskyWineBin)) {
    try {
      const info = plistParse(
        readFileSync(whiskyVersionPlist, 'utf-8')
      ) as PlistObject
      // FIXME: Verify this type at runtime
      const version = info['version'] as {
        build: string
        major: number
        minor: number
        patch: number
        preRelease: string
      }
      const versionString = `${version['major']}.${version['minor']}.${version['patch']}-${version['build']}`
      whisky.add({
        bin: whiskyWineBin,
        name: `Whisky - ${versionString}`,
        type: 'toolkit',
        lib: join(whiskyWinePath, 'Wine/lib'),
        lib32: join(whiskyWinePath, 'Wine/lib'),
        ...getWineExecs(whiskyWineBin)
      })
    } catch (error) {
      logError(
        [`Error getting wine version for ${whiskyWineBin}:`, error],
        LogPrefix.GlobalConfig
      )
    }
  }

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
  gameSettings: GameSettings,
  wrapper: string
): Promise<AllowedWineFlags> {
  let partialCommand: AllowedWineFlags = {}
  const { type: wineType, bin: wineExec } = gameSettings.wineVersion

  // Fix for people with old config
  const wineBin =
    wineExec.startsWith("'") && wineExec.endsWith("'")
      ? wineExec.replaceAll("'", '')
      : wineExec

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
      if (await isUmuSupported(gameSettings)) {
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
  gameSettings: GameSettings,
  wrapper: string
): Promise<string[]> {
  const partialCommand = await getWineFlags(gameSettings, wrapper)

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
  gameSettings: GameSettings,
  checkUmuInstalled = true
): Promise<boolean> {
  if (!isLinux) return false
  if (gameSettings.wineVersion.type !== 'proton') return false
  if (gameSettings.disableUMU === true) {
    return false
  }
  if (!checkUmuInstalled) return true
  if (!existsSync(await getUmuPath())) return false

  return true
}
