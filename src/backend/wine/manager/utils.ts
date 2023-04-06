/**
 * @file  Defines functions to update, download or remove available
 *        tool releases.
 */

import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
import {
  WineVersionInfo,
  ProgressInfo,
  Repositorys,
  State,
  VersionInfo
} from 'common/types'

import { getAvailableVersions, installVersion } from './downloader/main'
import { toolsPath, isMac } from '../../constants'
import { sendFrontendMessage } from '../../main_window'
import { TypeCheckedStoreBackend } from 'backend/electron_store'

const wineDownloaderInfoStore = new TypeCheckedStoreBackend(
  'wineDownloaderInfoStore',
  {
    cwd: 'store',
    name: 'wine-downloader-info'
  }
)

async function updateWineVersionInfos(
  fetch = false,
  count = 50
): Promise<WineVersionInfo[]> {
  let releases: WineVersionInfo[] = []

  logInfo('Updating wine versions info', LogPrefix.WineDownloader)
  if (fetch) {
    logInfo('Fetching upstream information...', LogPrefix.WineDownloader)
    const repositorys = isMac
      ? [Repositorys.WINECROSSOVER, Repositorys.WINESTAGINGMACOS]
      : [Repositorys.WINEGE, Repositorys.PROTONGE]
    await getAvailableVersions({
      repositorys,
      count
    }).then((response) => (releases = response as WineVersionInfo[]))

    if (wineDownloaderInfoStore.has('wine-releases')) {
      const old_releases = wineDownloaderInfoStore.get('wine-releases', [])

      old_releases.forEach((old) => {
        const index = releases.findIndex((release) => {
          return release?.version === old?.version
        })

        if (old.installDir !== undefined && existsSync(old?.installDir)) {
          if (index !== -1) {
            releases[index].installDir = old.installDir
            releases[index].isInstalled = old.isInstalled
            releases[index].disksize = old.disksize
            if (releases[index].checksum !== old.checksum) {
              releases[index].hasUpdate = true
            }
          } else {
            releases.push(old)
          }
        }
      })

      wineDownloaderInfoStore.delete('wine-releases')
    }

    wineDownloaderInfoStore.set('wine-releases', releases)
  } else {
    logInfo('Read local information ...', LogPrefix.WineDownloader)
    if (wineDownloaderInfoStore.has('wine-releases')) {
      releases.push(...wineDownloaderInfoStore.get('wine-releases', []))
    }
  }

  logInfo('wine versions updated', LogPrefix.WineDownloader)
  sendFrontendMessage('wineVersionsUpdated')
  return releases
}

async function installWineVersion(
  release: WineVersionInfo,
  onProgress: (state: State, progress?: ProgressInfo) => void,
  abortSignal: AbortSignal
) {
  let updatedInfo: WineVersionInfo

  if (!existsSync(`${toolsPath}/wine`)) {
    mkdirSync(`${toolsPath}/wine`, { recursive: true })
  }

  if (!existsSync(`${toolsPath}/proton`)) {
    mkdirSync(`${toolsPath}/proton`, { recursive: true })
  }

  logInfo(
    `Start installation of wine version ${release.version}`,
    LogPrefix.WineDownloader
  )

  const installDir = release?.type?.includes('Wine')
    ? `${toolsPath}/wine`
    : `${toolsPath}/proton`

  try {
    const response = await installVersion({
      versionInfo: release as VersionInfo,
      installDir,
      onProgress: onProgress,
      abortSignal: abortSignal
    })
    updatedInfo = {
      ...response.versionInfo,
      installDir: response.installDir,
      isInstalled: true,
      hasUpdate: false,
      type: release.type
    }
  } catch (error) {
    if (abortSignal.aborted) {
      logWarning(error, LogPrefix.WineDownloader)
      return 'abort'
    } else {
      logError(error, LogPrefix.WineDownloader)
      return 'error'
    }
  }

  // Update stored information
  if (wineDownloaderInfoStore.has('wine-releases')) {
    const releases = wineDownloaderInfoStore.get('wine-releases', [])

    const index = releases.findIndex((storedRelease) => {
      return release?.version === storedRelease?.version
    })

    if (index === -1) {
      logError(
        `Can't find ${release.version} in electron-store -> wine-downloader-info.json!`,
        LogPrefix.WineDownloader
      )
      return 'error'
    }

    releases[index] = updatedInfo

    wineDownloaderInfoStore.set('wine-releases', releases)
  } else {
    logError(
      `Couldn't find a tools entry in electron-store -> wine-downloader-info.json. Tool ${release.version} couldn't be installed!`,
      LogPrefix.WineDownloader
    )
    return 'error'
  }

  logInfo(
    `Finished installation of wine version ${release.version}`,
    LogPrefix.WineDownloader
  )

  sendFrontendMessage('wineVersionsUpdated')
  return 'success'
}

async function removeWineVersion(release: WineVersionInfo): Promise<boolean> {
  // remove folder if exist
  if (release.installDir !== undefined && existsSync(release.installDir)) {
    try {
      rmSync(release.installDir, { recursive: true })
    } catch (error) {
      logError(error, LogPrefix.WineDownloader)
      logWarning(
        `Couldn't remove folder ${release.installDir}! Still mark wine version ${release.version} as not installed!`,
        LogPrefix.WineDownloader
      )
    }
  }

  // update tool information
  if (wineDownloaderInfoStore.has('wine-releases')) {
    const releases = wineDownloaderInfoStore.get('wine-releases', [])

    const index = releases.findIndex((storedRelease) => {
      return release.version === storedRelease.version
    })

    if (index === -1) {
      logError(
        `Can't find ${release.version} in electron-store -> wine-downloader-info.json!`,
        LogPrefix.WineDownloader
      )
      return false
    }

    releases[index].isInstalled = false
    releases[index].installDir = ''
    releases[index].disksize = 0
    releases[index].hasUpdate = false

    wineDownloaderInfoStore.set('wine-releases', releases)
  } else {
    logError(
      `Couldn't find a wine-releases entry in electron-store -> wine-downloader-info.json. Release ${release.version} couldn't be removed!`,
      LogPrefix.WineDownloader
    )
    return false
  }

  logInfo(
    `Removed wine version ${release.version} succesfully.`,
    LogPrefix.WineDownloader
  )

  sendFrontendMessage('wineVersionsUpdated')
  return true
}

export { updateWineVersionInfos, installWineVersion, removeWineVersion }
