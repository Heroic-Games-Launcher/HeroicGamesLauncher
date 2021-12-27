/**
 * @file  Defines functions to update, download or remove available
 *        tool releases.
 */

import * as axios from 'axios'
import Store from 'electron-store'
import {
  existsSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  mkdirSync
} from 'graceful-fs'
import * as crypto from 'crypto'
import { WINEGE_URL } from './constants'
import { logError, logInfo, logWarning } from '../logger'
import { ToolsInfo } from './types'
import { downloadFile, unzipFile, getFolderSize } from '../utils'

const toolsStore = new Store({
  cwd: 'store',
  name: 'tools'
})

/**
 * Update and fetch all available tool releases.
 * @param fetch should new releases be fetched from github
 * @param count max releases to fetch for (default: 100)
 * @returns ToolsInfo list of available releases
 */
async function updateTools(fetch = false, count = '100'): Promise<ToolsInfo[]> {
  const releases: ToolsInfo[] = []

  logInfo('Updating tool list')
  if (fetch) {
    try {
      logInfo(`Fetch releases from ${WINEGE_URL}`)
      const data = await axios.default.get(WINEGE_URL + '?per_page=' + count)

      for (const release of data.data) {
        const release_data = {} as ToolsInfo
        release_data.version = release.tag_name
        release_data.date = release.published_at.split('T')[0]
        release_data.disksize = 0
        release_data.hasUpdate = false
        release_data.isInstalled = false
        release_data.installDir = ''

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
    } catch (error) {
      logError(error)
      logError('Could not fetch available tool versions.')
      return
    }

    if (toolsStore.has('tools')) {
      const old_releases = toolsStore.get('tools') as ToolsInfo[]

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

      toolsStore.delete('tools')
    }

    toolsStore.set('tools', releases)
  } else {
    if (toolsStore.has('tools')) {
      releases.push(...(toolsStore.get('tools') as ToolsInfo[]))
    }
  }

  logInfo('tool list updated')
  return releases
}

function unlinkFile(filePath: string) {
  try {
    unlinkSync(filePath)
    return true
  } catch (error) {
    logError(error)
    logError(`Failed to remove ${filePath}!`)
    return false
  }
}

async function installTool(
  release: ToolsInfo,
  onDownloadProgress: (progress: number) => void,
  onUnzipProgress: (progress: boolean) => void
): Promise<boolean> {
  // Check if installDir exist
  if (!existsSync(release.installDir)) {
    logError(`Installation directory ${release.installDir} doesn't exist!`)
    return false
  }

  // check release has download
  if (!release.download) {
    logError(`No download link provided for ${release.version}!`)
    return false
  }

  // get name of the wine folder to install the selected version
  const folderNameParts = release.download
    .split('/') // split path
    .slice(-1)[0] // get the archive name
    .split('.') // split dots
    .slice(0, -2) // remove the archive extensions (tar.xz or tar.gz)
  const toolDir = release.installDir + '/' + folderNameParts.join('.')

  const sourceChecksum = release.checksum
    ? (await axios.default.get(release.checksum, { responseType: 'text' })).data
    : undefined

  // Check if it already exist and updates are available
  if (existsSync(toolDir)) {
    if (!release.hasUpdate) {
      logInfo(`Tool ${release.version} already installed skip download.`)
      return true
    }
  }

  // Prepare destination where to download tar file
  const tarFile =
    release.installDir + '/' + release.download.split('/').slice(-1)[0]

  if (existsSync(tarFile)) {
    if (!unlinkFile(tarFile)) {
      return false
    }
  }

  // Download
  await downloadFile(release.download, release.installDir, onDownloadProgress)
    .then((response: string) => {
      logInfo(response)
    })
    .catch((error: string) => {
      logError(error)
      logError(`Download of Wine-${release.version} failed!`)
      unlinkFile(tarFile)
      return false
    })

  // Check if download checksum is correct
  const fileBuffer = readFileSync(tarFile)
  const hashSum = crypto.createHash('sha512')
  hashSum.update(fileBuffer)

  const downloadChecksum = hashSum.digest('hex')
  if (!sourceChecksum.includes(downloadChecksum)) {
    logError('Checksum verification failed')
    unlinkFile(tarFile)
    return false
  }

  // Unzip
  if (existsSync(toolDir)) {
    try {
      rmdirSync(toolDir, { recursive: true })
    } catch (error) {
      logError(error)
      logError(`Failed to remove already existing folder ${toolDir}!`)
      unlinkFile(tarFile)
      return false
    }
  }

  try {
    mkdirSync(toolDir)
  } catch (error) {
    logError(error)
    logError(`Failed to make folder ${toolDir}!`)
    unlinkFile(tarFile)
    return false
  }

  await unzipFile(tarFile, toolDir, onUnzipProgress)
    .then((response: string) => {
      logInfo(response)
    })
    .catch((error: string) => {
      logError(error)
      logError(`Unzip of ${tarFile.split('/').slice(-1)[0]} failed!`)
      rmdirSync(toolDir, { recursive: true })
      unlinkFile(tarFile)
      return false
    })

  // clean up
  unlinkFile(tarFile)

  // Update stored information
  if (toolsStore.has('tools')) {
    const releases = toolsStore.get('tools') as ToolsInfo[]

    const index = releases.findIndex((storedRelease) => {
      return release.version === storedRelease.version
    })

    if (index === -1) {
      logError(`Can't find ${release.version} in electron-store -> tools.json!`)
      return false
    }

    releases[index].isInstalled = true
    releases[index].installDir = toolDir
    releases[index].disksize = getFolderSize(toolDir)
    releases[index].hasUpdate = false

    toolsStore.set('tools', releases)
  } else {
    logInfo(
      `Couldn't find a tools entry in electron-store -> tools.json. Tool ${release.version} couldn't be installed!`
    )
    return false
  }

  return true
}

async function removeTool(release: ToolsInfo): Promise<boolean> {
  // remove folder if exist
  if (existsSync(release.installDir)) {
    try {
      rmdirSync(release.installDir, { recursive: true })
    } catch (error) {
      logError(error)
      logWarning(
        `Couldn't remove folder ${release.installDir}! Still mark tool ${release.version} as not installed!`
      )
    }
  }

  // update tool information
  if (toolsStore.has('tools')) {
    const releases = toolsStore.get('tools') as ToolsInfo[]

    const index = releases.findIndex((storedRelease) => {
      return release.version === storedRelease.version
    })

    if (index === -1) {
      logError(`Can't find ${release.version} in electron-store -> tools.json!`)
      return false
    }

    releases[index].isInstalled = false
    releases[index].installDir = ''
    releases[index].disksize = 0
    releases[index].hasUpdate = false

    toolsStore.set('tools', releases)
  } else {
    logInfo(
      `Couldn't find a tools entry in electron-store -> tools.json. Tool ${release.version} couldn't be removed!`
    )
    return false
  }
  return true
}

export { installTool, updateTools, removeTool }
