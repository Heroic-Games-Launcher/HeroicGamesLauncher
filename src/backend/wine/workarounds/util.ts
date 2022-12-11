import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import axios from 'axios'
import { dirname, join } from 'path'
import { GameSettings, PartialAsset, PartialRelease } from 'common/types'
import { COPYFILE_FICLONE } from 'constants'
import {
  getFullPrefixPath,
  isValidPrefix,
  runWineCommand
} from 'backend/launcher'
import { Workaround, WorkaroundsList } from './types'

/**
 * Finds a GitHub asset from a releases list
 * @param url The releases list url (should be in the form https://api.github.com/repos/AUTHOR/REPO/releases)
 * @param releaseCallback Called for each release in the releases list, to allow for filtering
 * @param assetCallback Called for each asset in the matching release, to again allow for filtering
 * @param releasesCache Instead of fetching the releases from GitHub, use this array
 * @returns The `asset` and `release` objects that were found, if any, along with all `releases` (useful for caching)
 */
export async function findGithubReleaseAsset(
  url: string,
  releaseCallback: (release: PartialRelease) => boolean,
  assetCallback: (asset: PartialAsset) => boolean,
  releasesCache?: PartialRelease[]
): Promise<{
  asset: PartialAsset | undefined
  release: PartialRelease
  releases: PartialRelease[]
}> {
  let releaseList = releasesCache
  if (!releaseList) {
    let releasesResponse
    try {
      releasesResponse = await axios.get(url)
    } catch (error) {
      throw new Error(`Failed to GET GitHub API data from ${url}`)
    }
    if (!releasesResponse || !Array.isArray(releasesResponse.data)) {
      throw new Error('GitHub API data is malformed')
    }
    releaseList = releasesResponse.data
  }

  const release: PartialRelease | undefined = releaseList.find(
    (release: unknown) => {
      return (
        release &&
        typeof release === 'object' &&
        'assets' in release &&
        Array.isArray(release.assets) &&
        releaseCallback(release as PartialRelease)
      )
    }
  )
  if (!release) {
    throw new Error('No releases were found that satisfy `releaseCallback`')
  }

  const asset = release.assets.find((asset: unknown) => {
    return (
      asset &&
      typeof asset === 'object' &&
      'name' in asset &&
      typeof asset.name === 'string' &&
      'content_type' in asset &&
      typeof asset.content_type === 'string' &&
      'browser_download_url' in asset &&
      typeof asset.browser_download_url === 'string' &&
      assetCallback(asset as PartialAsset)
    )
  }) as PartialAsset | undefined
  return { asset, release, releases: releaseList }
}

/**
 * Finds out characteristics about a Wineprefix
 * @param prefix The prefix to look at.
 *               Note that this has to be a "full" prefix path, pointing to the folder where "drive_c" is in. You can use `getFullPrefixPath` to obtain this
 * @param wineDir The directory where the wine binary used to create the prefix is in. Used to check if the prefix is exclusively 64-bit
 * @returns - system32: The path to the "C:\Windows\System32" folder of the prefix
 *          - syswow64: The path to the "C:\Windows\SysWOW64" folder of the prefix
 *          - prefixIsExclusively32Bit: Whether the prefix is exclusively 32-bit (created with `WINEARCH=win32`).
 *                                      SysWOW64 will not exist then, and System32 will contain 32-bit DLLs
 *          - prefixIsExclusively64Bit: Whether the prefix is exclusively 64-bit (created with `wine64`)
 */
function getPrefixCharacteristics(prefix: string, wineDir: string) {
  // NOTE: We're somewhat cheating here by assuming `syswow64` is *configured* as the
  //       path to SysWOW64 & `system32` is configured as the path to System32
  //       However, I don't think anyone in their right mind will change this (I wouldn't even know how to do that)
  const syswow64 = join(prefix, 'drive_c', 'windows', 'syswow64')
  const system32 = join(prefix, 'drive_c', 'windows', 'system32')

  // If a Wineprefix was created with `WINEARCH=win32`, it will not have a `syswow64` folder (32-bit DLLs just go directly into `system32`)
  const prefixIsExclusively32Bit = !existsSync(syswow64)
  // On the other hand, if Wine itself is exclusively 64-bit, both system32 and syswow64 will be present (why? No idea). So to detect this,
  // we instead check if a `wine` binary exists in the same folder as `wineVersion.bin`. If it doesn't, `wineVersion.bin` is *probably* pointing
  // to `wine64` instead
  const prefixIsExclusively64Bit = !existsSync(join(wineDir, 'wine'))

  return {
    system32,
    syswow64,
    prefixIsExclusively32Bit,
    prefixIsExclusively64Bit
  }
}

/**
 * Installs DLLs into a Wineprefix
 * @param rootPath The root path that contains the DLLs
 * @param gameSettings
 * @param dlls_32 Subfolder of `rootPath` containing 32-bit DLLs
 * @param dlls_64 Subfolder of `rootPath` containing 64-bit DLLs
 */
export async function dllInstaller(
  rootPath: string,
  gameSettings: GameSettings,
  dlls_32 = 'x32',
  dlls_64 = 'x64'
) {
  if (!isValidPrefix(gameSettings)) {
    throw new Error('Wineprefix is not valid')
  }
  const { wineVersion } = gameSettings
  const winePrefix = getFullPrefixPath(
    gameSettings.winePrefix,
    wineVersion.type,
    gameSettings.wineCrossoverBottle
  )

  const registeredDlls = new Set<string>()

  const {
    system32,
    syswow64,
    prefixIsExclusively32Bit,
    prefixIsExclusively64Bit
  } = getPrefixCharacteristics(winePrefix, dirname(wineVersion.bin))

  // Install 64-bit DLLs
  if (!prefixIsExclusively32Bit) {
    const sourcePath64 = join(rootPath, dlls_64)
    if (!existsSync(sourcePath64))
      throw new Error('64-bit DLL source path does not exist')

    for (const filename of readdirSync(sourcePath64)) {
      const src = join(sourcePath64, filename)
      const dest = join(system32, filename)
      installDll(src, dest)
      registeredDlls.add(filename.split('.').slice(0, -1).join('.'))
    }
  }

  // Install 32-bit DLLs
  if (!prefixIsExclusively64Bit) {
    const sourcePath32 = join(rootPath, dlls_32)
    if (!existsSync(sourcePath32)) {
      throw new Error('32-bit DLL source path does not exist')
    }
    for (const filename of readdirSync(sourcePath32)) {
      const src = join(sourcePath32, filename)
      // system32 keeps 32-bit DLLs on 32-bit Windows, and syswow64 keeps 32-bit DLLs on 64-bit Windows
      const dest = join(
        prefixIsExclusively32Bit ? system32 : syswow64,
        filename
      )
      installDll(src, dest)
      registeredDlls.add(filename.split('.').slice(0, -1).join('.'))
    }
  }

  // Register DLLs as native
  // NOTE: I'm still not sure if/why this is required, but everyone seems to recommend it
  //       The default DLL load order is "Native->Builtin", and a native DLL will now always
  //       be found. So setting it to just "Native" shouldn't do anything
  const overrides: Promise<void>[] = []
  for (const dllName of registeredDlls) {
    overrides.push(addDllOverride(dllName, gameSettings))
  }
  await Promise.allSettled(overrides)

  return registeredDlls
}

export async function dllRemover(
  dllList: Set<string>,
  gameSettings: GameSettings
) {
  const { wineVersion } = gameSettings
  const winePrefix = getFullPrefixPath(
    gameSettings.winePrefix,
    wineVersion.type,
    gameSettings.wineCrossoverBottle
  )
  // If the prefix no longer exists, consider every DLL uninstalled
  if (!existsSync(winePrefix)) return

  const {
    system32,
    syswow64,
    prefixIsExclusively32Bit,
    prefixIsExclusively64Bit
  } = getPrefixCharacteristics(winePrefix, dirname(wineVersion.bin))

  let haveToRunWineboot = false
  for (const dllName of dllList) {
    const dllFileName = dllName + '.dll'

    // Remove 64-bit DLLs
    if (!prefixIsExclusively32Bit) {
      const dllPath = join(system32, dllFileName)
      if (existsSync(dllPath))
        haveToRunWineboot = haveToRunWineboot || !removeDll(dllPath)
    }

    // Remove 32-bit DLLs
    if (!prefixIsExclusively64Bit) {
      const dllPath = join(
        prefixIsExclusively32Bit ? system32 : syswow64,
        dllFileName
      )
      if (existsSync(dllPath))
        haveToRunWineboot = haveToRunWineboot || !removeDll(dllPath)
    }
  }

  if (haveToRunWineboot) {
    const commandParts = ['wineboot', '-u']
    await runWineCommand({
      gameSettings,
      commandParts,
      wait: true,
      protonVerb: 'runinprefix'
    })
  }

  // Remove DLL overrides
  const overrides: Promise<void>[] = []
  for (const dllName of dllList) {
    overrides.push(removeDllOverride(dllName, gameSettings))
  }
  await Promise.allSettled(overrides)
}

/**
 * Verifies that all DLLs in a given list are installed in a prefix
 * @param dllList The DLL list to search for
 * @param settings
 * @returns
 */
export function verifyDlls(
  dllList: Set<string>,
  prefix: string,
  wineDir: string
) {
  const {
    system32,
    syswow64,
    prefixIsExclusively32Bit,
    prefixIsExclusively64Bit
  } = getPrefixCharacteristics(prefix, wineDir)

  const searchPaths = [system32]
  // Only search for DLLs in SysWOW64 if we've also added them before
  if (!prefixIsExclusively32Bit && !prefixIsExclusively64Bit) {
    searchPaths.push(syswow64)
  }

  // Search for all DLLs in the list in all search paths
  for (const dllName of dllList) {
    let found = false
    for (const path of searchPaths) {
      if (existsSync(join(path, dllName + '.dll'))) {
        found = true
        break
      }
    }
    if (found) continue
    // As soon as we didn't find one DLL, we know this dllList can't be the one that was installed into the prefix
    return false
  }
  return true
}

function installDll(src: string, dest: string, overwrite = false): void {
  if (!overwrite && existsSync(dest)) {
    renameSync(dest, dest + '.bak')
  }
  // `COPYFILE_FICLONE` will make this file a reflink until someone writes to it (which should never happen)
  copyFileSync(src, dest, COPYFILE_FICLONE)
}

function removeDll(path: string, nobackup = false): boolean {
  const backupPath = path + '.bak'
  if (!nobackup && existsSync(backupPath)) {
    renameSync(backupPath, path)
    return true
  } else {
    if (existsSync(path)) rmSync(path)
    return false
  }
}

type DLLLoadOrder =
  | 'builtin'
  | 'native'
  | 'native,builtin'
  | 'builtin,native'
  | ''

// TODO: Rewrite this to modify the .reg file directly
//       We'd need some sort of (non-strict) INI file parser for that to be possible
async function addDllOverride(
  dllName: string,
  gameSettings: GameSettings,
  override: DLLLoadOrder = 'native,builtin'
) {
  const commandParts: string[] = [
    'reg',
    'add',
    'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides',
    '/v',
    dllName,
    '/d',
    override,
    '/f'
  ]

  await runWineCommand({
    gameSettings,
    commandParts,
    wait: false,
    protonVerb: 'runinprefix',
    options: {
      logMessagePrefix: `Setting DLL "${dllName}" to "${override}"`
    }
  })
}

async function removeDllOverride(dllName: string, gameSettings: GameSettings) {
  const commandParts: string[] = [
    'reg',
    'delete',
    'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides',
    '/v',
    dllName,
    '/f'
  ]

  await runWineCommand({
    gameSettings,
    commandParts,
    wait: false,
    protonVerb: 'runinprefix',
    options: { logMessagePrefix: `Removing DLL override for ${dllName}` }
  })
}

export function storeModifiedDllList(
  dllList: Set<string>,
  keyName: Workaround,
  prefix: string
) {
  const workaroundsListFilePath = join(prefix, 'heroic_workarounds.json')
  let workaroundsList: WorkaroundsList = {}
  if (existsSync(workaroundsListFilePath)) {
    workaroundsList = JSON.parse(readFileSync(workaroundsListFilePath, 'utf-8'))
  }

  let modifiedData = workaroundsList[keyName]
  if (!modifiedData) {
    modifiedData = {}
  }
  // NOTE: JSON.stringify just stores an empty object for `Set`s, so we have to convert this to an array here
  modifiedData.dllList = Array.from(dllList)
  workaroundsList[keyName] = modifiedData

  writeFileSync(
    workaroundsListFilePath,
    JSON.stringify(workaroundsList, undefined, 2)
  )
}

export function getModifiedDllList(
  keyName: Workaround,
  prefix: string
): Set<string> | undefined {
  const workaroundsListFilePath = join(prefix, 'heroic_workarounds.json')
  if (!existsSync(workaroundsListFilePath)) {
    return
  }

  let workaroundsList: WorkaroundsList = {}
  try {
    workaroundsList = JSON.parse(readFileSync(workaroundsListFilePath, 'utf-8'))
  } catch (error) {
    return
  }

  const workaroundData = workaroundsList[keyName]
  if (!workaroundData) {
    return
  }
  const dllList = workaroundData.dllList
  if (!Array.isArray(dllList)) return
  return new Set(dllList)
}

export function removeModifiedDllList(keyName: Workaround, prefix: string) {
  const workaroundsListFilePath = join(prefix, 'heroic_workarounds.json')
  if (!existsSync(workaroundsListFilePath)) {
    return
  }

  let workaroundsList: WorkaroundsList = {}
  try {
    workaroundsList = JSON.parse(readFileSync(workaroundsListFilePath, 'utf-8'))
  } catch (error) {
    return
  }

  delete workaroundsList[keyName]

  writeFileSync(
    workaroundsListFilePath,
    JSON.stringify(workaroundsList, undefined, 2)
  )
}
