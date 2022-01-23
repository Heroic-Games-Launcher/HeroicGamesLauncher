/**
 * @file  Defines functions to update, download or remove available
 *        tool releases.
 */

import Store from 'electron-store'
import { existsSync, rmSync } from 'graceful-fs'
import { logError, logInfo, logWarning } from '../logger'
import { WineVersionInfo } from './types'

import {
  getAvailableVersions,
  installVersion,
  ProgressInfo,
  State,
  VersionInfo
} from 'heroic-wine-downloader'
import { app } from 'electron'

const wineDownloaderInfoStore = new Store({
  cwd: 'store',
  name: 'wine-downloader-info'
})

const wineDownloaderLog = (
  level: 'info' | 'warning' | 'error',
  message: string
) => {
  switch (level) {
    case 'info':
      logInfo(`[Wine downloader]: ${message}`)
      break
    case 'warning':
      logWarning(`[Wine downloader]: ${message}`)
      break
    case 'error':
      logError(`[Wine downloader]: ${message}`)
      break
    default:
      break
  }
}

async function updateWineVersionInfos(
  fetch = false,
  count = 100
): Promise<WineVersionInfo[]> {
  let releases: WineVersionInfo[] = []

  wineDownloaderLog('info', 'Updating wine versions info')
  if (fetch) {
    await getAvailableVersions({ count: count })
      .then((response) => (releases = response as WineVersionInfo[]))
      .catch((error) => {
        throw error
      })

    if (wineDownloaderInfoStore.has('wine-releases')) {
      const old_releases = wineDownloaderInfoStore.get(
        'wine-releases'
      ) as WineVersionInfo[]

      old_releases.forEach((old) => {
        const index = releases.findIndex((release) => {
          return release.version === old.version
        })

        if (existsSync(old.installDir)) {
          if (index !== -1) {
            releases[index].installDir = old.installDir
            releases[index].isInstalled = old.isInstalled
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
    if (wineDownloaderInfoStore.has('wine-releases')) {
      releases.push(
        ...(wineDownloaderInfoStore.get('wine-releases') as WineVersionInfo[])
      )
    }
  }

  wineDownloaderLog('info', 'wine versions updated')
  return releases
}

async function installWineVersion(
  release: WineVersionInfo,
  onProgress: (state: State, progress: ProgressInfo) => void
) {
  let updatedInfo: WineVersionInfo

  wineDownloaderLog(
    'info',
    `Start installation of wine version ${release.version}`
  )
  await installVersion({
    versionInfo: release as VersionInfo,
    installDir: `${app.getPath('appData')}/heroic/tools/proton`,
    onProgress: onProgress
  })
    .then((response) => {
      updatedInfo = {
        ...response.versionInfo,
        installDir: response.installDir,
        isInstalled: true,
        hasUpdate: false
      }
    })
    .catch((error: Error) => {
      wineDownloaderLog('error', error.message)
      return false
    })

  // Update stored information
  if (wineDownloaderInfoStore.has('wine-releases')) {
    const releases = wineDownloaderInfoStore.get(
      'wine-releases'
    ) as WineVersionInfo[]

    const index = releases.findIndex((storedRelease) => {
      return release.version === storedRelease.version
    })

    if (index === -1) {
      wineDownloaderLog(
        'error',
        `Can't find ${release.version} in electron-store -> wine-downloader-info.json!`
      )
      return false
    }

    releases[index] = updatedInfo

    wineDownloaderInfoStore.set('wine-releases', releases)
  } else {
    wineDownloaderLog(
      'error',
      `Couldn't find a tools entry in electron-store -> wine-downloader-info.json. Tool ${release.version} couldn't be installed!`
    )
    return false
  }

  wineDownloaderLog(
    'info',
    `Finished installation of wine version ${release.version}`
  )
  return true
}

async function removeWineVersion(release: WineVersionInfo): Promise<boolean> {
  // remove folder if exist
  if (existsSync(release.installDir)) {
    try {
      rmSync(release.installDir, { recursive: true })
    } catch (error) {
      wineDownloaderLog('error', error)
      wineDownloaderLog(
        'warning',
        `Couldn't remove folder ${release.installDir}! Still mark wine version ${release.version} as not installed!`
      )
    }
  }

  // update tool information
  if (wineDownloaderInfoStore.has('wine-releases')) {
    const releases = wineDownloaderInfoStore.get(
      'wine-releases'
    ) as WineVersionInfo[]

    const index = releases.findIndex((storedRelease) => {
      return release.version === storedRelease.version
    })

    if (index === -1) {
      wineDownloaderLog(
        'error',
        `Can't find ${release.version} in electron-store -> wine-downloader-info.json!`
      )
      return false
    }

    releases[index].isInstalled = false
    releases[index].installDir = ''
    releases[index].disksize = 0
    releases[index].hasUpdate = false

    wineDownloaderInfoStore.set('wine-releases', releases)
  } else {
    wineDownloaderLog(
      'error',
      `Couldn't find a wine-releases entry in electron-store -> wine-downloader-info.json. Release ${release.version} couldn't be removed!`
    )
    return false
  }

  wineDownloaderLog(
    'info',
    `Removed wine version ${release.version} succesfully.`
  )
  return true
}

export { updateWineVersionInfos, installWineVersion, removeWineVersion }
