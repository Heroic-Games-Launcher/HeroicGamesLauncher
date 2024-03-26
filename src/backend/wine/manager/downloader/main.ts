import { logWarning, LogPrefix, logError } from 'backend/logger/logger'
import * as axios from 'axios'
import * as crypto from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync
} from 'graceful-fs'

import {
  WINEGE_URL,
  PROTONGE_URL,
  PROTON_URL,
  WINELUTRIS_URL,
  WINECROSSOVER_URL,
  WINESTAGINGMACOS_URL
} from './constants'
import { VersionInfo, Repositorys } from 'common/types'
import {
  fetchReleases,
  getFolderSize,
  unlinkFile,
  unzipFile
} from './utilities'
import { calculateEta, downloadFile } from 'backend/utils'
import type { WineManagerStatus } from 'common/types'

interface getVersionsProps {
  repositorys?: Repositorys[]
  count?: number
}

/**
 * Fetch all available releases for given {@link Repositorys}.
 * If no repository is given, all {@link Repositorys} are checked.
 * @param repositorys array of {@link Repositorys}.
 * @defaultValue all {@link Repositorys}
 * @param count max versions to fetch for each {@link Repository}
 * @defaultValue 100
 * @returns * resolves with an array of {@link VersionInfo}
 *          * rejects with an {@link Error}
 */
async function getAvailableVersions({
  repositorys = [Repositorys.WINEGE, Repositorys.PROTONGE],
  count = 100
}: getVersionsProps): Promise<VersionInfo[]> {
  const releases: Array<VersionInfo> = []

  for await (const repo of repositorys) {
    switch (repo) {
      case Repositorys.WINEGE: {
        await fetchReleases({
          url: WINEGE_URL,
          type: 'Wine-GE',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            logError(error, LogPrefix.WineDownloader)
          })
        break
      }
      case Repositorys.PROTONGE: {
        await fetchReleases({
          url: PROTONGE_URL,
          type: 'Proton-GE',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            logError(error, LogPrefix.WineDownloader)
          })
        break
      }
      case Repositorys.PROTON: {
        await fetchReleases({
          url: PROTON_URL,
          type: 'Proton',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            logError(error, LogPrefix.WineDownloader)
          })
        break
      }
      case Repositorys.WINELUTRIS: {
        await fetchReleases({
          url: WINELUTRIS_URL,
          type: 'Wine-Lutris',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            logError(error, LogPrefix.WineDownloader)
          })
        break
      }
      case Repositorys.WINECROSSOVER: {
        await fetchReleases({
          url: WINECROSSOVER_URL,
          type: 'Wine-Crossover',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            logError(error, LogPrefix.WineDownloader)
          })
        break
      }
      case Repositorys.WINESTAGINGMACOS: {
        await fetchReleases({
          url: WINESTAGINGMACOS_URL,
          type: 'Wine-Staging-macOS',
          count: count
        })
          .then((fetchedReleases: VersionInfo[]) => {
            releases.push(...fetchedReleases)
          })
          .catch((error: Error) => {
            logError(error, LogPrefix.WineDownloader)
          })
        break
      }
      default: {
        logWarning(
          `Unknown and not supported repository key passed! Skip fetch for ${repo}`,
          LogPrefix.WineDownloader
        )
        break
      }
    }
  }

  return releases
}

interface installProps {
  versionInfo: VersionInfo
  installDir: string
  overwrite?: boolean
  onProgress?: (state: WineManagerStatus) => void
  abortSignal?: AbortSignal
}

/**
 * Installs a given version to the given installation directory.
 *
 * @param versionInfo the version to install as {@link VersionInfo}
 * @param installDir absolute path to installation directory
 * @param overwrite allow overwriting existing version installation
 * @defaultValue false
 * @param onProgress callback to get installation progress
 * @defaultValue void
 * @returns * resolves with updated {@link VersionInfo} and the full installation
 *            directory
 *          * rejects with an {@link Error}
 */
async function installVersion({
  versionInfo,
  installDir,
  overwrite = false,
  onProgress = () => {
    return
  },
  abortSignal
}: installProps): Promise<{ versionInfo: VersionInfo; installDir: string }> {
  /*
   * VARIABLE DECLARATION
   */

  const tarFile =
    installDir + '/' + versionInfo.download.split('/').slice(-1)[0]
  const installSubDir = installDir + '/' + versionInfo.version
  const sourceChecksum = versionInfo.checksum
    ? (
        await axios.default.get(versionInfo.checksum, {
          responseType: 'text'
        })
      ).data
    : undefined

  const abortHandler = () => {
    const error = new Error(
      `Installation of ${versionInfo.version} was aborted!`
    )
    error.name = 'AbortError'
    unlinkFile(tarFile)
    if (existsSync(installSubDir)) {
      rmSync(installSubDir, { recursive: true })
    }

    throw error
  }

  /*
   * INSTALLATION PROCESS
   */

  // Check if installDir exist
  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true })
  } else if (!statSync(installDir).isDirectory()) {
    throw new Error(`Installation directory ${installDir} is not a directory!`)
  }

  if (!versionInfo.download) {
    // check versionInfo has download
    throw new Error(`No download link provided for ${versionInfo.version}!`)
  }

  // Check if it already exist
  if (existsSync(installSubDir) && !overwrite) {
    logWarning(
      `${versionInfo.version} is already installed. Skip installing! \n
      Consider using 'override: true if you wan't to override it!'`,
      LogPrefix.WineDownloader
    )

    // resolve with disksize
    versionInfo.disksize = getFolderSize(installSubDir)
    return { versionInfo: versionInfo, installDir: installSubDir }
  }

  // remove tarFile if still exist
  unlinkFile(tarFile)

  const getProgress = (
    downloadedBytes: number,
    downloadSpeed: number,
    percentage: number
  ) => {
    const eta = calculateEta(
      downloadedBytes,
      downloadSpeed,
      versionInfo.downsize
    )

    onProgress({
      status: 'downloading',
      percentage,
      eta: eta!,
      avgSpeed: downloadSpeed
    })
  }

  // Download
  await downloadFile({
    url: versionInfo.download,
    dest: installDir,
    progressCallback: getProgress,
    abortSignal
  }).catch((error: Error) => {
    if (error instanceof Error && error.message.includes('Download stopped')) {
      abortHandler()
    }

    unlinkFile(tarFile)
    throw new Error(
      `Download of ${versionInfo.version} failed with:\n ${error}`
    )
  })

  // Check if download checksum is correct
  const fileBuffer = readFileSync(tarFile)
  const hashSum = crypto.createHash('sha512')
  hashSum.update(fileBuffer)

  const downloadChecksum = hashSum.digest('hex')
  if (sourceChecksum) {
    if (!sourceChecksum.includes(downloadChecksum)) {
      unlinkFile(tarFile)
      throw new Error('Checksum verification failed')
    }
  } else {
    logWarning(
      `No checksum provided. Download of ${versionInfo.version} could be invalid!`,
      LogPrefix.WineDownloader
    )
  }

  if (!overwrite) {
    // Unzip
    try {
      mkdirSync(installSubDir)
    } catch (error) {
      unlinkFile(tarFile)
      throw new Error(`Failed to make folder ${installSubDir} with:\n ${error}`)
    }
  } else {
    // backup old folder
    renameSync(installSubDir, `${installSubDir}_backup`)
  }

  await unzipFile({
    filePath: tarFile,
    unzipDir: installSubDir,
    overwrite: overwrite,
    onProgress: onProgress,
    abortSignal: abortSignal
  }).catch((error: string) => {
    if (error.includes('AbortError')) {
      abortHandler()
    }

    // remove artefacts
    rmSync(installSubDir, { recursive: true })
    unlinkFile(tarFile)

    // restore backup
    if (overwrite) {
      renameSync(`${installSubDir}_backup`, installSubDir)
    }

    throw new Error(
      `Unzip of ${tarFile.split('/').slice(-1)[0]} failed with:\n ${error}`
    )
  })

  // clean up
  if (overwrite) {
    rmSync(`${installSubDir}_backup`, { recursive: true })
  }
  unlinkFile(tarFile)

  // resolve with disksize
  versionInfo.disksize = getFolderSize(installSubDir)
  return { versionInfo: versionInfo, installDir: installSubDir }
}

export { getAvailableVersions, installVersion }
