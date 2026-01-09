/**
 * @file  Defines functions to update, download or remove available
 *        tool releases.
 */

import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { WineVersionInfo, Repositorys, WineManagerStatus } from 'common/types'

import { getAvailableVersions, installVersion } from './downloader/main'
import { sendFrontendMessage } from '../../ipc'
import { TypeCheckedStoreBackend } from 'backend/electron_store'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import { toolsPath } from 'backend/constants/paths'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { GlobalConfig } from '../../config'
import { join } from 'path'
import { ReleasesData } from 'backend/utils/releases'

export const wineDownloaderInfoStore = new TypeCheckedStoreBackend(
  'wineDownloaderInfoStore',
  {
    cwd: 'store',
    name: 'wine-downloader-info'
  }
)

function getLatestLocalVersions() {
  const localWines = wineDownloaderInfoStore.get('wine-releases', [])

  if (isLinux) {
    return {
      latestWineGE: localWines.find((wine) => wine.version === 'Wine-GE-latest')
        ?.date,
      latestGEProton: localWines.find(
        (wine) => wine.version === 'GE-Proton-latest'
      )?.date
    }
  }

  if (isMac) {
    return {
      latestWineCrossover: localWines.find(
        (wine) => wine.version === 'Wine-Crossover-latest'
      )?.date,
      latestWineStaging: localWines.find(
        (wine) => wine.version === 'Wine-Staging-macOS-latest'
      )?.date,
      latestGPTK: localWines.find(
        (wine) => wine.version === 'Game-Porting-Toolkit-latest'
      )?.date
    }
  }

  return {}
}

// Fetch the latest releases of the different translation layers but only
// if we don't already have the latest version locally
//
// Note that this updates the list of releases of a given repo if and only if
// we already have a list for that given repo
export function updateWineListsIfOutdated(releasesData: ReleasesData) {
  if (isWindows) return

  const latestLocalVersions = getLatestLocalVersions()
  const repositoriesToFetch = []

  // compare dates to know which repositories to fetch
  if (isLinux) {
    if (latestLocalVersions?.latestGEProton) {
      if (
        Date.parse(latestLocalVersions.latestGEProton) <
        Date.parse(releasesData['ge-proton'].published_at.replace(/T.*/, ''))
      )
        repositoriesToFetch.push(Repositorys.PROTONGE)
    }

    if (latestLocalVersions?.latestWineGE) {
      if (
        Date.parse(latestLocalVersions.latestWineGE) <
        Date.parse(releasesData['wine-ge'].published_at.replace(/T.*/, ''))
      )
        repositoriesToFetch.push(Repositorys.WINEGE)
    }
  }

  if (isMac) {
    if (latestLocalVersions?.latestWineCrossover) {
      if (
        Date.parse(latestLocalVersions.latestWineCrossover) <
        Date.parse(
          releasesData['wine-crossover'].published_at.replace(/T.*/, '')
        )
      )
        repositoriesToFetch.push(Repositorys.WINECROSSOVER)
    }

    if (latestLocalVersions?.latestWineStaging) {
      if (
        Date.parse(latestLocalVersions.latestWineStaging) <
        Date.parse(releasesData['wine-staging'].published_at.replace(/T.*/, ''))
      )
        repositoriesToFetch.push(Repositorys.WINESTAGINGMACOS)
    }

    if (latestLocalVersions?.latestGPTK) {
      if (
        Date.parse(latestLocalVersions.latestGPTK) <
        Date.parse(
          releasesData['game-porting-toolkit'].published_at.replace(/T.*/, '')
        )
      )
        repositoriesToFetch.push(Repositorys.GPTK)
    }
  }

  if (repositoriesToFetch.length > 0) {
    void updateWineVersionInfos(true, repositoriesToFetch)
  }
}

async function updateWineVersionInfos(
  fetch = false,
  repositorys: Repositorys[] | null = null,
  count = 50
): Promise<WineVersionInfo[]> {
  let releases: WineVersionInfo[] = []

  logInfo('Updating wine versions info', LogPrefix.WineDownloader)
  if (fetch) {
    logInfo('Fetching upstream information...', LogPrefix.WineDownloader)

    if (repositorys === null) {
      repositorys = isMac
        ? [
            Repositorys.WINECROSSOVER,
            Repositorys.WINESTAGINGMACOS,
            Repositorys.GPTK
          ]
        : [Repositorys.WINEGE, Repositorys.PROTONGE]
    }

    await getAvailableVersions({
      repositorys,
      count
    }).then((response) => (releases = response as WineVersionInfo[]))

    let releasesToStore: WineVersionInfo[] = []

    if (wineDownloaderInfoStore.has('wine-releases')) {
      const old_releases = wineDownloaderInfoStore.get('wine-releases', [])

      old_releases.forEach((old) => {
        releasesToStore.push(old)

        const index = releases.findIndex((release) => {
          if (isLinux && release.type === 'GE-Proton') {
            // The "Proton" prefix got dropped from the version string. We still
            // want to detect old versions though
            if (`Proton-${release.version}` === old.version) return true
            // -latest is an even more special case, since it got renamed from
            // "Proton-GE-latest" to "GE-Proton-latest"
            if (
              release.version === 'GE-Proton-latest' &&
              old.version === 'Proton-GE-latest'
            )
              return true
          }
          return release.version === old.version
        })

        if (old.installDir !== undefined && existsSync(old?.installDir)) {
          if (index !== -1) {
            releases[index].installDir = old.installDir
            releases[index].isInstalled = old.isInstalled
            releases[index].disksize = old.disksize
            if (releases[index].checksum !== old.checksum || old.hasUpdate) {
              releases[index].hasUpdate = true
            }
          } else {
            releases.push(old)
          }
        }
      })

      // here we are adding new elements to the list and replacing the `-latest`
      releases.forEach((release) => {
        const foundIndex = releasesToStore.findIndex(
          (oldRelease) =>
            oldRelease.version === release.version ||
            oldRelease.version === `Proton-${release.version}`
        )
        if (foundIndex === -1) {
          releasesToStore.push(release)
        } else if (release.version.endsWith('-latest')) {
          releasesToStore[foundIndex] = release
        }
      })
    } else {
      releasesToStore = releases
    }

    wineDownloaderInfoStore.set(
      'wine-releases',
      releasesToStore.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    )
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

function getInstallDir(release: WineVersionInfo): string {
  if (release?.type?.includes('Wine')) {
    return `${toolsPath}/wine`
  } else if (release.type.includes('Toolkit')) {
    return `${toolsPath}/game-porting-toolkit`
  } else {
    const config = GlobalConfig.get().getSettings()
    if (config.downloadProtonToSteam && config.defaultSteamPath) {
      const steamCompatPath = join(
        config.defaultSteamPath,
        'compatibilitytools.d'
      )
      if (existsSync(steamCompatPath)) {
        return steamCompatPath
      }
      // If Steam path doesn't exist, fall back to default
      logWarning(
        'Steam compatibilitytools.d directory does not exist, defaulting to Heroic tools path',
        LogPrefix.WineDownloader
      )
    }
    return `${toolsPath}/proton`
  }
}

async function installWineVersion(
  release: WineVersionInfo,
  onProgress: (status: WineManagerStatus) => void
) {
  let updatedInfo: WineVersionInfo
  const variant = release.hasUpdate ? 'update' : 'installation'

  if (!existsSync(`${toolsPath}/wine`)) {
    mkdirSync(`${toolsPath}/wine`, { recursive: true })
  }

  if (isMac && !existsSync(`${toolsPath}/game-porting-toolkit`)) {
    mkdirSync(`${toolsPath}/game-porting-toolkit`, { recursive: true })
  }

  if (!existsSync(`${toolsPath}/proton`)) {
    mkdirSync(`${toolsPath}/proton`, { recursive: true })
  }

  logInfo(
    `Start ${variant} of wine version ${release.version}`,
    LogPrefix.WineDownloader
  )

  const installDir = getInstallDir(release)

  const abortController = createAbortController(release.version)

  try {
    const response = await installVersion({
      versionInfo: release,
      installDir,
      overwrite: release.hasUpdate,
      onProgress: onProgress,
      abortSignal: abortController.signal
    })
    updatedInfo = {
      ...response.versionInfo,
      installDir: response.installDir,
      isInstalled: true,
      hasUpdate: false,
      type: release.type
    }
  } catch (error) {
    if (abortController.signal.aborted) {
      logWarning(error, LogPrefix.WineDownloader)
      return 'abort'
    } else {
      logError(error, LogPrefix.WineDownloader)
      return 'error'
    }
  } finally {
    deleteAbortController(release.version)
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
    `Finished ${variant} of wine version ${release.version}`,
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
