import { GlobalConfig } from 'backend/config'
import {
  configPath,
  getSteamLibraries,
  isMac,
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
  const defaultWine = await getDefaultWine()
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
export async function getGamingPortingToolkitWine(): Promise<
  Set<WineInstallation>
> {
  const gamingPortingToolkitWine = new Set<WineInstallation>()
  if (!isMac) {
    return gamingPortingToolkitWine
  }

  logInfo('Searching for Gaming Porting Toolkit Wine', LogPrefix.GlobalConfig)
  const { stdout } = await execAsync('mdfind wine64')
  const wineBin = stdout.split('\n').filter((p) => {
    return p.match(/game-porting-toolkit.*\/wine64$/)
  })[0]

  if (existsSync(wineBin)) {
    logInfo(
      `Found Gaming Porting Toolkit Wine at ${dirname(wineBin)}`,
      LogPrefix.GlobalConfig
    )
    try {
      const { stdout: out } = await execAsync(`'${wineBin}' --version`)
      const version = out.split('\n')[0]
      gamingPortingToolkitWine.add({
        ...getWineExecs(wineBin),
        name: `GPTK Wine (DX11/DX12 Only) - ${version}`,
        type: 'toolkit',
        lib: `${dirname(wineBin)}/../lib`,
        lib32: `${dirname(wineBin)}/../lib`,
        bin: wineBin
      })
    } catch (error) {
      logError(
        `Error getting wine version for ${wineBin}`,
        LogPrefix.GlobalConfig
      )
    }
  }

  return gamingPortingToolkitWine
}

export function getWineFlags(
  wineBin: string,
  wineType: WineInstallation['type'],
  wrapper: string
) {
  switch (wineType) {
    case 'wine':
    case 'toolkit':
      return ['--wine', wineBin, '--wrapper', wrapper]
    case 'proton':
      return ['--no-wine', '--wrapper', `${wrapper} '${wineBin}' run`]
    default:
      return []
  }
}
