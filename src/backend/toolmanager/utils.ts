import * as axios from 'axios'
import {
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  unlinkSync
} from 'graceful-fs'
import { spawnSync, spawn } from 'child_process'
import {
  ProgressInfo,
  State,
  VersionInfo,
  Type,
  ToolVersionInfo,
  Repositorys
} from '../../common/types/toolmanager'
import Store from 'electron-store'
import {
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from '../../backend/logger/logger'
import { getAvailableVersions, installVersion } from './toolmanager'
import { heroicToolsPath } from '../../backend/constants'

const wineDownloaderInfoStore = new Store({
  cwd: 'store',
  name: 'wine-downloader-info'
})

interface fetchProps {
  url: string
  type: Type
  count: number
}

/**
 * Helper to fetch releases from given url.
 *
 * @param url url where to fetch releases from.
 * @param type type of the releases (wine, proton, ge, ...)
 * @param count number of releases to fetch
 * @returns * resolves with an array of {@link VersionInfo}
 *          * rejects with an {@link Error}
 */
async function fetchReleases({
  url,
  type,
  count
}: fetchProps): Promise<VersionInfo[]> {
  const releases: Array<VersionInfo> = []
  return new Promise((resolve, reject) => {
    axios.default
      .get(url + '?per_page=' + count)
      .then((data) => {
        for (const release of data.data) {
          const release_data = {} as VersionInfo

          switch (type) {
            case 'Soda-Bottles':
            case 'Wine-GE':
              release_data.version = `Wine-${release.tag_name}`
              break
            case 'Proton-GE':
              release_data.version = `Proton-${release.tag_name}`
              break
            case 'DXVK':
              release_data.version = `DXVK-${release.tag_name}`
              break
            case 'DXVK-Async':
              release_data.version = `DXVK-Async-${release.tag_name}`
              break
            case 'DXVK-NVAPI':
              release_data.version = `DXVK-NVAPI-${release.tag_name}`
              break
            case 'VKD3D':
              release_data.version = `VKD3D-${release.tag_name.replace(
                'vkd3d-',
                ''
              )}`
              break
            default:
              release_data.version = release.tag_name
              break
          }
          release_data.type = type
          release_data.date = release.published_at.split('T')[0]
          release_data.disksize = 0

          for (const asset of release.assets) {
            if (asset.name.endsWith('sha512sum')) {
              release_data.checksum = asset.browser_download_url
            } else if (
              asset.name.endsWith('tar.gz') ||
              asset.name.endsWith('tar.xz')
            ) {
              release_data.download = asset.browser_download_url
              release_data.downsize = asset.size
            }
          }

          releases.push(release_data)
        }
        resolve(releases)
      })
      .catch((error) => {
        reject(
          new Error(
            `Could not fetch available releases from ${url} with error:\n ${error}`
          )
        )
      })
  })
}

/**
 * Helper to unlink a file.
 *
 * @param filePath absolute path to file
 * @throws {@link Error}
 */
function unlinkFile(filePath: string) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
  } catch {
    throw new Error(`Couldn't remove ${filePath}!`)
  }
}

/**
 * Helper to get disk space of installed version.
 *
 * @param folder absolute path to folder
 * @returns size of folder in bytes
 */
function getFolderSize(folder: string): number {
  const { stdout } = spawnSync('du', ['-sb', folder])
  return parseInt(stdout.toString())
}

interface downloadProps {
  url: string
  downloadDir: string
  downsize: number
  onProgress: (state: State, progress?: ProgressInfo) => void
  abortSignal?: AbortSignal
}

/**
 * Helper to download a file via curl.
 *
 * @param url url of the file
 * @param downloadDir absolute path to the download directory
 * @param downsize needed to calculate download speed
 * @param onProgress callback to get download progress
 * @param abortSignal signal to abort spawn
 * @returns resolves or rejects with a message
 */
async function downloadFile({
  url,
  downloadDir,
  downsize,
  onProgress,
  abortSignal
}: downloadProps): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!existsSync(downloadDir)) {
        reject(`Download path ${downloadDir} does not exist!`)
      } else if (!statSync(downloadDir).isDirectory()) {
        reject(`Download path ${downloadDir} is not a directory!`)
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: can't give error a type but it mostly a Error or SystemError
      reject(error.message)
    }

    let percentage = 0
    const filePath = downloadDir + '/' + url.split('/').slice(-1)[0]
    const download = spawn('curl', ['-L', url, '-o', filePath, '-#'], {
      signal: abortSignal
    })

    const startTime = process.hrtime.bigint()

    // curl does somehow print on stderr
    // progress calculation is done on stderr
    download.stderr.on('data', function (stderr) {
      // get time
      const time = process.hrtime.bigint()

      // get info from curl output
      const newPercentage = parseInt(stderr.toString())

      // check if percentage is valid
      percentage =
        !isNaN(newPercentage) &&
        100 > newPercentage &&
        newPercentage > percentage
          ? newPercentage
          : percentage

      // calculate download speed
      const alreadyDonwloaded = (downsize * percentage) / 100
      const seconds = Number(time - startTime) / Math.pow(10, 9)
      const avgSpeed = alreadyDonwloaded / seconds

      // calculate eta
      const eta =
        percentage > 0 ? (100 * seconds) / percentage - seconds : seconds

      // Calculate avgSpeed
      onProgress('downloading', {
        percentage: percentage,
        avgSpeed: avgSpeed,
        eta: Math.ceil(eta)
      })
    })

    download.on('close', function (exitcode: number) {
      onProgress('idle')
      if (exitcode !== 0) {
        reject(`Download of ${url} failed with exit code:\n ${exitcode}!`)
      }

      resolve(`Succesfully downloaded ${url} to ${filePath}.`)
    })

    download.on('error', (error: Error) => {
      if (error.name.includes('AbortError')) {
        reject(error.name)
      } else {
        reject(`Download of ${url} failed with:\n ${error.message}!`)
      }
    })
  })
}

interface unzipProps {
  filePath: string
  unzipDir: string
  overwrite?: boolean
  onProgress: (state: State, progress?: ProgressInfo) => void
  abortSignal?: AbortSignal
}

/**
 * Helper to unzip an archive via tar.
 *
 * @param filePath url of the file
 * @param unzipDir absolute path to the unzip directory
 * @param overwrite allow overwriting existing unpacked files
 * @defaultValue false
 * @param onProgress callback to get unzip progress
 * @returns resolves or rejects with a message
 */
async function unzipFile({
  filePath,
  unzipDir,
  overwrite = false,
  onProgress,
  abortSignal
}: unzipProps): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!existsSync(filePath)) {
        reject(`Zip file ${filePath} does not exist!`)
      } else if (statSync(filePath).isDirectory()) {
        reject(`Archive path ${filePath} is not a file!`)
      } else if (!existsSync(unzipDir)) {
        reject(`Install path ${unzipDir} does not exist!`)
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: can't give error a type but it mostly a Error or SystemError
      reject(error.message)
    }

    let extension_options = ''
    if (filePath.endsWith('tar.gz')) {
      extension_options = '-vzxf'
    } else if (filePath.endsWith('tar.xz')) {
      extension_options = '-vJxf'
    } else {
      reject(`Archive type ${filePath.split('.').pop()} not supported!`)
    }

    const args = [
      '--directory',
      unzipDir,
      '--strip-components=1',
      extension_options,
      filePath
    ]

    if (overwrite) {
      args.push('--overwrite')
    }

    const unzip = spawn('tar', args, { signal: abortSignal })

    onProgress('unzipping')

    unzip.stdout.on('data', function () {
      onProgress('unzipping')
    })

    unzip.stderr.on('data', function (stderr: string) {
      onProgress('idle')
      reject(`Unzip of ${filePath} failed with:\n ${stderr}!`)
    })

    unzip.on('close', function (exitcode: number) {
      onProgress('idle')
      if (exitcode !== 0) {
        reject(`Unzip of ${filePath} failed with exit code:\n ${exitcode}!`)
      }

      resolve(`Succesfully unzip ${filePath} to ${unzipDir}.`)
    })

    unzip.on('error', (error: Error) => {
      if (error.name.includes('AbortError')) {
        reject(error.name)
      } else {
        reject(`Unzip of ${filePath} failed with:\n ${error.message}!`)
      }
    })
  })
}

async function updateToolVersionInfos(
  fetch = false,
  count = 50
): Promise<ToolVersionInfo[]> {
  let releases: ToolVersionInfo[] = []

  logInfo('Updating tool versions info', { prefix: LogPrefix.ToolManager })
  if (fetch) {
    logInfo('Fetching upstream information...', {
      prefix: LogPrefix.ToolManager
    })
    await getAvailableVersions({
      repositorys: [
        Repositorys.WINEGE,
        Repositorys.PROTONGE,
        Repositorys.SODA_BOTTLES,
        Repositorys.DXVK,
        Repositorys.DXVK_ASYNC,
        Repositorys.DXVK_NVAPI,
        Repositorys.VKD3D
      ],
      count
    })
      .then((response) => (releases = response as ToolVersionInfo[]))
      .catch((error) => {
        throw error
      })

    if (wineDownloaderInfoStore.has('wine-releases')) {
      const old_releases = wineDownloaderInfoStore.get(
        'wine-releases'
      ) as ToolVersionInfo[]

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
    logInfo('Read local information ...', { prefix: LogPrefix.ToolManager })
    if (wineDownloaderInfoStore.has('wine-releases')) {
      releases.push(
        ...(wineDownloaderInfoStore.get(
          'wine-releases',
          []
        ) as ToolVersionInfo[])
      )
    }
  }

  logInfo('tool versions updated', { prefix: LogPrefix.ToolManager })
  return releases
}

async function installToolVersion(
  release: ToolVersionInfo,
  onProgress: (state: State, progress?: ProgressInfo) => void,
  abortSignal: AbortSignal
) {
  let updatedInfo: ToolVersionInfo

  logInfo(`Start installation of tool version ${release.version}`, {
    prefix: LogPrefix.ToolManager
  })

  let installDir = ''
  switch (release?.type) {
    case 'Wine-GE':
      installDir = `${heroicToolsPath}/wine`
      break
    case 'Proton-GE':
      installDir = `${heroicToolsPath}/proton`
      break
    case 'Soda-Bottles':
      installDir = `${heroicToolsPath}/soda`
      break
    case 'DXVK':
      installDir = `${heroicToolsPath}/dxvk`
      break
    case 'DXVK-Async':
      installDir = `${heroicToolsPath}/dxvk-async`
      break
    case 'DXVK-NVAPI':
      installDir = `${heroicToolsPath}/dxvk-nvapi`
      break
    case 'VKD3D':
      installDir = `${heroicToolsPath}/vkd3d`
      break
    default:
      break
  }

  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true })
  }

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
      logWarning(error, { prefix: LogPrefix.ToolManager })
      return 'abort'
    } else {
      logError(error, { prefix: LogPrefix.ToolManager })
      return 'error'
    }
  }

  // Update stored information
  if (wineDownloaderInfoStore.has('wine-releases')) {
    const releases = wineDownloaderInfoStore.get(
      'wine-releases'
    ) as ToolVersionInfo[]

    const index = releases.findIndex((storedRelease) => {
      return release?.version === storedRelease?.version
    })

    if (index === -1) {
      logError(
        `Can't find ${release.version} in electron-store -> wine-downloader-info.json!`,
        { prefix: LogPrefix.ToolManager }
      )
      return 'error'
    }

    releases[index] = updatedInfo

    wineDownloaderInfoStore.set('wine-releases', releases)
  } else {
    logError(
      `Couldn't find a tools entry in electron-store -> wine-downloader-info.json. Tool ${release.version} couldn't be installed!`,
      { prefix: LogPrefix.ToolManager }
    )
    return 'error'
  }

  logInfo(`Finished installation of tool version ${release.version}`, {
    prefix: LogPrefix.ToolManager
  })
  return 'success'
}

async function removeToolVersion(release: ToolVersionInfo): Promise<boolean> {
  // remove folder if exist
  if (release.installDir !== undefined && existsSync(release.installDir)) {
    try {
      rmSync(release.installDir, { recursive: true })
    } catch (error) {
      logError(error, { prefix: LogPrefix.ToolManager })
      logWarning(
        `Couldn't remove folder ${release.installDir}! Still mark tool version ${release.version} as not installed!`,
        { prefix: LogPrefix.ToolManager }
      )
    }
  }

  // update tool information
  if (wineDownloaderInfoStore.has('wine-releases')) {
    const releases = wineDownloaderInfoStore.get(
      'wine-releases'
    ) as ToolVersionInfo[]

    const index = releases.findIndex((storedRelease) => {
      return release.version === storedRelease.version
    })

    if (index === -1) {
      logError(
        `Can't find ${release.version} in electron-store -> wine-downloader-info.json!`,
        { prefix: LogPrefix.ToolManager }
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
      `Couldn't find a tool-release entry in electron-store -> wine-downloader-info.json. Release ${release.version} couldn't be removed!`,
      { prefix: LogPrefix.ToolManager }
    )
    return false
  }

  logInfo(`Removed tool version ${release.version} succesfully.`, {
    prefix: LogPrefix.ToolManager
  })
  return true
}

export {
  fetchReleases,
  unlinkFile,
  getFolderSize,
  downloadFile,
  unzipFile,
  updateToolVersionInfos,
  installToolVersion,
  removeToolVersion
}
