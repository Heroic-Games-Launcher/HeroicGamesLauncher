import { workaroundsPath } from 'backend/constants'
import { getFullPrefixPath, isValidPrefix } from 'backend/launcher'
import { logDebug, logError } from 'backend/logger/logger'
import { downloadFile, extractTarFile } from 'backend/wine/runtimes/util'
import { GameSettings, PartialRelease } from 'common/types'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { join, dirname, basename } from 'path'
import {
  dllInstaller,
  dllRemover,
  findGithubReleaseAsset,
  getWorkaroundEntry,
  removeWorkaroundEntry,
  addWorkaroundEntry,
  verifyDlls
} from '../util'

// NOTE: This workaround is similar in behavior to DXVK, see its implementation for comments on functionality
let _githubReleasesCache: PartialRelease[] | undefined = undefined

async function ensureVersionIsDownloaded(
  version?: string
): Promise<string | false> {
  let asset, release, releases
  try {
    const res = await findGithubReleaseAsset(
      'https://api.github.com/repos/HansKristian-Work/vkd3d-proton/releases',
      (release) => {
        return !version || release.tag_name === version
      },
      (asset) => asset.name.startsWith('vkd3d-proton-'),
      _githubReleasesCache
    )
    ;({ asset, release, releases } = res)
  } catch (error) {
    logError(['Unable to get GitHub API data for VKD3D:', error])
    return false
  }

  if (!asset) return false
  _githubReleasesCache = releases

  const extractedPath = join(workaroundsPath, 'vkd3d', release.tag_name)
  if (existsSync(extractedPath)) return extractedPath

  const archivePath = join(workaroundsPath, 'vkd3d', asset.name)
  mkdirSync(dirname(archivePath), { recursive: true })
  try {
    await downloadFile(asset.browser_download_url, archivePath)
  } catch (error) {
    logError(['Unable to download VKD3D archive:', error])
    return false
  }

  try {
    await extractTarFile(archivePath, asset.content_type, {
      extractedPath,
      strip: 1
    })
  } catch (error) {
    logError(['Unable to extract VKD3D archive:', error])
    return false
  }

  rmSync(archivePath)

  return extractedPath
}

const VKD3D = {
  install: async (settings: GameSettings, version?: string) => {
    if (!isValidPrefix(settings)) {
      return false
    }

    const extractedPath = await ensureVersionIsDownloaded(version)
    if (!extractedPath) {
      return false
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
      addWorkaroundEntry(
        installedDlls,
        basename(extractedPath),
        'vkd3d',
        fullPrefix
      )
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

    const entry = getWorkaroundEntry('vkd3d', prefix)
    const dllList = entry?.dllList
    if (!dllList) {
      return false
    }

    try {
      await dllRemover(dllList, settings)
    } catch (error) {
      logError(['Failed to remove VKD3D DLLs:', error])
      return false
    }

    removeWorkaroundEntry('vkd3d', prefix)
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

    const entry = getWorkaroundEntry('vkd3d', prefix)
    const dllList = entry?.dllList
    if (!dllList) {
      return false
    }

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
    const entry = getWorkaroundEntry('vkd3d', prefix)
    const { dllList, version } = { ...entry }
    if (!dllList) {
      return false
    }

    if (!newVersion) {
      const newVersionPath = await ensureVersionIsDownloaded()
      if (newVersionPath) {
        newVersion = basename(newVersionPath)
      }
    }

    if (version === newVersion) {
      return true
    }

    dllRemover(dllList, settings, true)

    return VKD3D.install(settings, newVersion)
  }
}

export default VKD3D
