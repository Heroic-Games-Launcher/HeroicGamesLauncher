import { isLinux, workaroundsPath } from 'backend/constants'
import { getFullPrefixPath, isValidPrefix } from 'backend/launcher'
import { logError, logDebug } from 'backend/logger/logger'
import { downloadFile, extractTarFile } from 'backend/wine/runtimes/util'
import { GameSettings, PartialRelease } from 'common/types'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { join, dirname } from 'path'
import {
  findGithubReleaseAsset,
  dllInstaller,
  storeModifiedDllList,
  getModifiedDllList,
  dllRemover,
  removeModifiedDllList,
  verifyDlls
} from '../util'

let _githubReleasesCache: PartialRelease[] | undefined = undefined

const DXVK = {
  install: async (settings: GameSettings, version?: string) => {
    // If we don't have a valid Wineprefix to install to, don't even try
    if (!isValidPrefix(settings)) {
      return false
    }

    const { asset, release, releases } = await findGithubReleaseAsset(
      isLinux
        ? 'https://api.github.com/repos/doitsujin/dxvk/releases'
        : 'https://api.github.com/repos/Gcenx/DXVK-macOS/releases',
      (release) => {
        // If we don't have a version, accept the first valid release (download the latest one)
        return !version || release.tag_name === version
      },
      (asset) =>
        asset.name.startsWith('dxvk-') && !asset.name.startsWith('dxvk-native'),
      _githubReleasesCache
    ).catch((error) => {
      logError(['Unable to get GitHub API data for DXVK:', error])
      return { asset: undefined, release: undefined, releases: undefined }
    })
    if (!asset || !release || !releases) {
      return false
    }
    _githubReleasesCache = releases

    const extractedPath = join(workaroundsPath, 'dxvk', release.tag_name)
    if (!existsSync(extractedPath)) {
      const archivePath = join(workaroundsPath, 'dxvk', asset.name)
      mkdirSync(dirname(archivePath), { recursive: true })
      try {
        await downloadFile(asset.browser_download_url, archivePath)
      } catch (error) {
        logError(['Unable to download DXVK archive:', error])
        return false
      }

      await extractTarFile(archivePath, asset.content_type, {
        extractedPath,
        strip: 1
      }).catch((error) => {
        logError(['Unable to extract DXVK archive:', error])
        return ''
      })
      if (!extractedPath) {
        return false
      }

      // Remove tar file since we don't need it anymore
      rmSync(archivePath)
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
      storeModifiedDllList(installedDlls, 'dxvk', fullPrefix)
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

    const dllList = getModifiedDllList('dxvk', prefix)
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

    removeModifiedDllList('dxvk', prefix)
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

    const dllList = getModifiedDllList('dxvk', prefix)
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
  }
}

export default DXVK
