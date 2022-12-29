import { isLinux, workaroundsPath } from 'backend/constants'
import { getFullPrefixPath, isValidPrefix } from 'backend/launcher'
import { logError, logDebug } from 'backend/logger/logger'
import { downloadFile, extractTarFile } from 'backend/wine/runtimes/util'
import { GameSettings, PartialRelease } from 'common/types'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { join, dirname, basename } from 'path'
import {
  findGithubReleaseAsset,
  dllInstaller,
  addWorkaroundEntry,
  getWorkaroundEntry,
  dllRemover,
  removeWorkaroundEntry,
  verifyDlls
} from '../util'

let _githubReleasesCache: PartialRelease[] | undefined = undefined

/**
 * Makes sure that a specific version of DXVK is downloaded
 * @param version The version to verify. Defaults to the latest available one
 */
async function ensureVersionIsDownloaded(
  version?: string
): Promise<string | false> {
  let asset, release, releases
  try {
    const res = await findGithubReleaseAsset(
      isLinux
        ? 'https://api.github.com/repos/doitsujin/dxvk/releases'
        : 'https://api.github.com/repos/Gcenx/DXVK-macOS/releases',
      // If we don't have a version, accept the first valid release (download the latest one)
      (release) => !version || release.tag_name === version,
      (asset) =>
        asset.name.startsWith('dxvk-') && !asset.name.startsWith('dxvk-native'),
      _githubReleasesCache
    )
    ;({ asset, release, releases } = res)
  } catch (error) {
    logError(['Unable to get GitHub API data for DXVK:', error])
    return false
  }

  if (!asset) return false
  _githubReleasesCache = releases

  const extractedPath = join(workaroundsPath, 'dxvk', release.tag_name)
  // If the path already exists, we already downloaded this version before
  if (existsSync(extractedPath)) return extractedPath

  const archivePath = join(workaroundsPath, 'dxvk', asset.name)
  mkdirSync(dirname(archivePath), { recursive: true })
  try {
    await downloadFile(asset.browser_download_url, archivePath)
  } catch (error) {
    logError(['Unable to download DXVK archive:', error])
    return false
  }

  try {
    await extractTarFile(archivePath, asset.content_type, {
      extractedPath,
      strip: 1
    })
  } catch (error) {
    logError(['Unable to extract DXVK archive:', error])
    return false
  }

  // Remove tar file since we don't need it anymore
  rmSync(archivePath)

  return extractedPath
}

const DXVK = {
  install: async (settings: GameSettings, version?: string) => {
    // If we don't have a valid Wineprefix to install to, don't even try
    if (!isValidPrefix(settings)) {
      return false
    }

    const extractedPath = await ensureVersionIsDownloaded(version)
    if (!extractedPath) {
      return false
    }

    // Install DLLs into prefix
    let installedDlls
    try {
      installedDlls = await dllInstaller(extractedPath, settings)
    } catch (error) {
      logError(['Unable to install DXVK DLLs:', error])
      return false
    }

    // Save which DLLs were installed
    const { wineVersion, winePrefix, wineCrossoverBottle } = settings
    const fullPrefix = getFullPrefixPath(
      winePrefix,
      wineVersion.type,
      wineCrossoverBottle
    )
    try {
      addWorkaroundEntry(
        installedDlls,
        basename(extractedPath),
        'dxvk',
        fullPrefix
      )
    } catch (error) {
      logError(['Unable to write installed DLLs list:', error])
      return false
    }

    return true
  },

  remove: async (settings: GameSettings) => {
    if (!DXVK.isInstalled(settings)) {
      logDebug('DXVK is not installed, not trying to remove it')
      return true
    }

    const prefix = getFullPrefixPath(
      settings.winePrefix,
      settings.wineVersion.type,
      settings.wineCrossoverBottle
    )

    const entry = getWorkaroundEntry('dxvk', prefix)
    const dllList = entry?.dllList
    // This shouldn't happen, since `isInstalled` already checks for it
    if (!dllList) {
      return false
    }

    try {
      await dllRemover(dllList, settings)
    } catch (error) {
      logError(['Failed to remove DXVK DLLs:', error])
      return false
    }

    removeWorkaroundEntry('dxvk', prefix)
    return true
  },

  isInstalled: (settings: GameSettings) => {
    const prefix = getFullPrefixPath(
      settings.winePrefix,
      settings.wineVersion.type,
      settings.wineCrossoverBottle
    )
    // If the prefix doesn't exist, nothing is installed
    if (!existsSync(prefix)) {
      return false
    }

    const entry = getWorkaroundEntry('dxvk', prefix)
    const dllList = entry?.dllList
    // If there's no DLL list saved for that prefix, *we* didn't install DXVK
    if (!dllList) {
      return false
    }

    // If we have a list saved, make sure they're all still there
    const allDllsInstalled = verifyDlls(
      dllList,
      prefix,
      dirname(settings.wineVersion.bin)
    )

    return allDllsInstalled
  },

  update: async (settings: GameSettings, newVersion?: string) => {
    const { wineVersion } = settings
    const prefix = getFullPrefixPath(
      settings.winePrefix,
      wineVersion.type,
      settings.wineCrossoverBottle
    )
    const entry = getWorkaroundEntry('dxvk', prefix)
    const { dllList, version } = { ...entry }
    if (!dllList) {
      return false
    }

    // If a version wasn't specified, figure out what the latest version is
    if (!newVersion) {
      const newVersionPath = await ensureVersionIsDownloaded()
      if (newVersionPath) {
        newVersion = basename(newVersionPath)
      }
    }

    // Don't re-install if we're already on that version
    if (version === newVersion) {
      return true
    }

    // Remove existing DLLs
    dllRemover(dllList, settings, true)

    // Install the new version
    return DXVK.install(settings, newVersion)
  }
}

export default DXVK
