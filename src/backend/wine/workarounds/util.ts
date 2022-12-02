import {
  copyFileSync,
  existsSync,
  readdirSync,
  renameSync,
  statSync
} from 'graceful-fs'
import axios from 'axios'
import { join } from 'path'
import { downloadFile } from '../runtimes/util'
import { GameSettings } from 'common/types'
import { isLinux } from 'backend/constants'
import { COPYFILE_FICLONE } from 'constants'
import { runWineCommand } from 'backend/launcher'

type PartialRelease = {
  assets: unknown[]
  [key: string]: unknown
}
type PartialAsset = {
  name: string
  browser_download_url: string
  content_type: string
  [key: string]: unknown
}

/**
 * Downloads a GitHub asset from a releases list
 * @param url The releases list url (should be in the form https://api.github.com/repos/AUTHOR/REPO/releases)
 * @param savePath File path, where to put the asset (should point to a directory)
 * @param releaseCallback Called for each release in the releases list, to allow for filtering
 * @param assetCallback Called for each asset in the matching release, to again allow for filtering
 * @returns An object with keys `archivePath` (the final path where the asset was saved) and `asset` (the asset that ended up being downloaded)
 */
export async function downloadGithubReleaseAsset(
  url: string,
  savePath: string,
  releaseCallback: (release: PartialRelease) => boolean,
  assetCallback: (asset: PartialAsset) => boolean
): Promise<{ archivePath: string; asset: PartialAsset }> {
  let releases
  try {
    releases = await axios.get(url)
  } catch (error) {
    throw new Error(`Failed to GET GitHub API data from ${url}`)
  }
  if (!releases || !Array.isArray(releases.data)) {
    throw new Error('GitHub API data is malformed?')
  }

  const release: PartialRelease | undefined = releases.data.find(
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
  if (!asset) {
    throw new Error('No assets were found that satisfy `assetCallback`')
  }

  if (!existsSync(savePath)) {
    throw new Error('Save path does not exist')
  }
  if (!statSync(savePath).isDirectory()) {
    throw new Error('Save path is not a directory')
  }
  const archivePath = join(savePath, asset.name)

  await downloadFile(asset.browser_download_url, archivePath)

  return { archivePath, asset }
}

/**
 * Installs DLLs into a Wineprefix
 * @param rootPath The root path that contains the DLLs
 * @param gameSettings
 * @param dlls_64 Subfolder of `rootPath` containing 64-bit DLLs
 * @param dlls_32 Subfolder of `rootPath` containing 32-bit DLLs
 */
export async function dllInstaller(
  rootPath: string,
  gameSettings: GameSettings,
  dlls_64 = 'x64',
  dlls_32 = 'x32'
) {
  if (!isLinux) throw new Error('dllInstaller is not yet supported on MacOS')

  let { winePrefix } = gameSettings
  const { wineVersion } = gameSettings
  if (!existsSync(winePrefix)) throw new Error('Wineprefix does not exist')

  if (wineVersion.type === 'proton') {
    winePrefix = join(winePrefix, 'pfx')
  }

  // NOTE: We're somewhat cheating here by assuming `syswow64` is *configured* as the
  //       path to SysWOW64 & `system32` is configured as the path to System32
  //       However, I don't think anyone in their right mind will change this
  const syswow64 = join(winePrefix, 'drive_c', 'windows', 'syswow64')
  const system32 = join(winePrefix, 'drive_c', 'windows', 'system32')

  const is64bitPrefix = existsSync(syswow64)

  const registeredDlls = new Set<string>()

  // Install 64-bit DLLs
  if (is64bitPrefix) {
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
  const sourcePath32 = join(rootPath, dlls_32)
  if (!existsSync(sourcePath32)) {
    throw new Error('32-bit DLL source path does not exist')
  }
  for (const filename of readdirSync(sourcePath32)) {
    const src = join(sourcePath32, filename)
    const dest = join(is64bitPrefix ? syswow64 : system32, filename)
    installDll(src, dest)
    registeredDlls.add(filename.split('.').slice(0, -1).join('.'))
  }

  // Register DLLs as native
  // NOTE: I'm still not sure if/why this is required, but everyone seems to recommend it
  //       The default DLL load order is "Native->Builtin", and a native DLL will now always
  //       be found. So setting it to just "Native" shouldn't do anything
  for (const dllName of registeredDlls) {
    await addDllOverride(dllName, gameSettings)
  }

  return registeredDlls
}

function installDll(src: string, dest: string, overwrite = false) {
  if (!overwrite && existsSync(dest)) {
    renameSync(dest, dest + '.bak')
  }
  copyFileSync(src, dest, COPYFILE_FICLONE)
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
  override: DLLLoadOrder = 'native'
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

export function storeModifiedDlls(
  dllList: Set<string>,
  keyName: string,
  prefix: string
) {
  // TODO: Write `dllList` into a JSON file in the prefix
}

// TODO: dllRemover and all necessary parts
