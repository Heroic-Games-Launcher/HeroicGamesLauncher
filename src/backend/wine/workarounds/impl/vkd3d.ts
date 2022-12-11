import { workaroundsPath } from 'backend/constants'
import { getFullPrefixPath, isValidPrefix } from 'backend/launcher'
import { logDebug, logError } from 'backend/logger/logger'
import { downloadFile, extractTarFile } from 'backend/wine/runtimes/util'
import { GameSettings, PartialRelease } from 'common/types'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { join, dirname } from 'path'
import {
  dllInstaller,
  dllRemover,
  findGithubReleaseAsset,
  getModifiedDllList,
  removeModifiedDllList,
  storeModifiedDllList,
  verifyDlls
} from '../util'

let _githubReleasesCache: PartialRelease[] | undefined = undefined

// NOTE: This workaround is similar in behavior to DXVK, see its implementation for comments on functionality
const VKD3D = {
  install: async (settings: GameSettings, version?: string) => {
    if (!isValidPrefix(settings)) {
      return false
    }

    const { asset, release, releases } = await findGithubReleaseAsset(
      'https://api.github.com/repos/HansKristian-Work/vkd3d-proton/releases',
      (release) => {
        return !version || release.tag_name === version
      },
      (asset) => asset.name.startsWith('vkd3d-proton-'),
      _githubReleasesCache
    ).catch((error) => {
      logError(['Unable to get GitHub API data for VKD3D:', error])
      return { asset: undefined, release: undefined, releases: undefined }
    })
    if (!asset || !release || !releases) {
      return false
    }
    _githubReleasesCache = releases

    const extractedPath = join(workaroundsPath, 'vkd3d', release.tag_name)
    if (!existsSync(extractedPath)) {
      const archivePath = join(workaroundsPath, 'vkd3d', asset.name)
      mkdirSync(dirname(archivePath), { recursive: true })
      try {
        await downloadFile(asset.browser_download_url, archivePath)
      } catch (error) {
        logError(['Unable to download VKD3D archive:', error])
        return false
      }

      await extractTarFile(archivePath, asset.content_type, {
        extractedPath,
        strip: 1
      }).catch((error) => {
        logError(['Unable to extract VKD3D archive:', error])
        return ''
      })
      if (!extractedPath) {
        return false
      }

      rmSync(archivePath)
    }

    let installedDlls
    try {
      installedDlls = await dllInstaller(extractedPath, settings, 'x86')
    } catch (error) {
      logError(['Unable to install VKD3D DLLs:', error])
      return false
    }

    const { wineVersion, winePrefix, wineCrossoverBottle } = settings
    const fullPrefix = getFullPrefixPath(
      winePrefix,
      wineVersion.type,
      wineCrossoverBottle
    )
    try {
      storeModifiedDllList(installedDlls, 'vkd3d', fullPrefix)
    } catch (error) {
      logError(['Unable to write installed DLLs list:', error])
      return false
    }

    return true
  },
  remove: async (settings: GameSettings) => {
    if (!VKD3D.isInstalled(settings)) {
      logDebug('VKD3D is not installed, not trying to remove it')
      return true
    }

    const prefix = getFullPrefixPath(
      settings.winePrefix,
      settings.wineVersion.type,
      settings.wineCrossoverBottle
    )

    const dllList = getModifiedDllList('vkd3d', prefix)
    if (!dllList) {
      return false
    }

    try {
      await dllRemover(dllList, settings)
    } catch (error) {
      logError(['Failed to remove VKD3D DLLs:', error])
      return false
    }

    removeModifiedDllList('vkd3d', prefix)
    return true
  },
  isInstalled: (settings: GameSettings) => {
    const prefix = getFullPrefixPath(
      settings.winePrefix,
      settings.wineVersion.type,
      settings.wineCrossoverBottle
    )
    if (!existsSync(prefix)) {
      return false
    }

    const dllList = getModifiedDllList('vkd3d', prefix)
    if (!dllList) {
      return false
    }

    const allDllsInstalled = verifyDlls(
      dllList,
      prefix,
      dirname(settings.wineVersion.bin)
    )

    return allDllsInstalled
  }
}
export default VKD3D
