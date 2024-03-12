// Manage redist required by games and push them to download queue
// as Galaxy Common Redistributables

import {
  gamesConfigPath,
  gogdlConfigPath,
  gogRedistPath
} from 'backend/constants'
import path from 'path'
import { existsSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import { logError, logInfo, LogPrefix } from 'backend/logger/logger'
import {
  GOGRedistManifest,
  GOGv1Manifest,
  GOGv2Manifest
} from 'common/types/gog'
import { getGameInfo, onInstallOrUpdateOutput } from './games'
import { runRunnerCommand as runGogdlCommand } from './library'
import {
  addToQueue,
  getQueueInformation
} from 'backend/downloadmanager/downloadqueue'
import { DMQueueElement } from 'common/types'
import axios from 'axios'
import { GOGUser } from './user'
import { isOnline } from 'backend/online_monitor'
import { getGlobalConfig } from '../../config/global'

export async function checkForRedistUpdates() {
  if (!GOGUser.isLoggedIn() || !isOnline()) {
    return
  }
  const manifestPath = path.join(gogRedistPath, '.gogdl-redist-manifest')
  let shouldUpdate = false
  if (existsSync(manifestPath)) {
    // Check if newer buildId is available
    try {
      const fileData = await readFile(manifestPath, { encoding: 'utf8' })
      const manifest: GOGRedistManifest = JSON.parse(fileData)

      const requiredRedistList = await getRequiredRedistList()
      const requiredRedist = requiredRedistList.filter((redist) => {
        const foundRedist = manifest.depots.find(
          (dep) => dep.dependencyId === redist
        )
        return foundRedist && foundRedist.executable.path.startsWith('__redist') // Filter redist that are installed into game directory
      })
      // Filter redist with those only
      const installed = manifest.HGLInstalled || []
      // Something is no longer required or new redist is needed
      if (requiredRedist.length !== installed.length) {
        logInfo('Updating redist, reason - different number of redist', {
          prefix: LogPrefix.Gog
        })
        shouldUpdate = true
      } else {
        // Check if we need new redist
        const sortedReq = requiredRedist.sort()
        const sortedInst = installed.sort()

        for (const index in sortedReq) {
          if (sortedReq[index] !== sortedInst[index]) {
            logInfo('Updating redist, reason - different redist required', {
              prefix: LogPrefix.Gog
            })
            shouldUpdate = true
            break
          }
        }
      }

      // Check if manifest itself changed
      if (!shouldUpdate) {
        const buildId = manifest?.build_id
        const response = await axios.get(
          'https://content-system.gog.com/dependencies/repository?generation=2'
        )
        const newBuildId = response.data.build_id
        shouldUpdate = buildId !== newBuildId
        if (shouldUpdate) {
          logInfo('Updating redist, reason - new buildId', {
            prefix: LogPrefix.Gog
          })
        }
      }
    } catch (e) {
      logError(['Failed to read gog redist manifest', e], {
        prefix: LogPrefix.Gog
      })
      return
    }
  } else {
    shouldUpdate = true
  }
  if (!shouldUpdate) {
    return
  }
  pushRedistUpdateToQueue()
}

async function pushRedistUpdateToQueue() {
  const currentQueue = getQueueInformation()

  const currentRedistElement = currentQueue.elements.find(
    (element) => element.params.appName === 'gog-redist'
  )

  if (currentRedistElement) {
    return
  }
  const newElement = createRedistDMQueueElement()

  await addToQueue(newElement)
}

export function createRedistDMQueueElement(): DMQueueElement {
  const gameInfo = getGameInfo('gog-redist')
  const newElement: DMQueueElement = {
    params: {
      appName: 'gog-redist',
      runner: 'gog',
      path: gogRedistPath,
      platformToInstall: 'windows',
      gameInfo,
      size: '?? MB'
    },
    addToQueueTime: new Date().getTime(),
    startTime: 0,
    endTime: 0,
    type: 'update'
  }
  return newElement
}

export async function getRequiredRedistList(): Promise<string[]> {
  // Scan manifests in gogdl directory to obtain list of redist that will be
  // required
  const manifestsDir = path.join(gogdlConfigPath, 'manifests')
  if (!existsSync(manifestsDir)) {
    return ['ISI']
  }

  const manifests = await readdir(manifestsDir)
  const redist: string[] = ['ISI']
  // Iterate over files
  for (const manifest of manifests) {
    const manifestDataRaw = await readFile(path.join(manifestsDir, manifest), {
      encoding: 'utf8'
    })
    try {
      const manifestData: GOGv1Manifest | GOGv2Manifest =
        JSON.parse(manifestDataRaw)

      // Get list from manifest and merge with global redist variable
      if (manifestData.version === 1) {
        const dependencies = manifestData.product.depots.reduce((acc, next) => {
          if ('redist' in next) {
            acc.push(next.redist)
          }
          return acc
        }, [] as string[])
        for (const dependency of dependencies) {
          if (!redist.includes(dependency)) {
            redist.push(dependency)
          }
        }
      } else if (manifestData.version === 2) {
        for (const dependency of manifestData.dependencies || []) {
          if (!redist.includes(dependency)) {
            redist.push(dependency)
          }
        }
      }
    } catch (e) {
      logError(['REDIST:', 'Unable to parse manifest', manifest, String(e)], {
        prefix: LogPrefix.Gog
      })
      continue
    }
  }

  return redist
}

export async function updateRedist(redistToSync: string[]): Promise<{
  status: 'done' | 'error'
}> {
  const { maxDownloadWorkers } = getGlobalConfig()
  const workers = maxDownloadWorkers
    ? ['--max-workers', `${maxDownloadWorkers}`]
    : []
  const logPath = path.join(gamesConfigPath, 'gog-redist.log')

  const commandParts = [
    'redist',
    '--ids',
    redistToSync.join(','),
    '--path',
    gogRedistPath,
    ...workers
  ]

  logInfo('Updating GOG redistributables', {
    prefix: LogPrefix.Gog
  })

  const res = await runGogdlCommand(commandParts, {
    abortId: 'gog-redist',
    logMessagePrefix: 'GOG REDIST:',
    logFile: logPath,
    onOutput: (output) =>
      onInstallOrUpdateOutput('gog-redist', 'updating', output)
  })

  if (res.error) {
    logError(['Failed to update redist', res.error], LogPrefix.Gog)
    return { status: 'error' }
  }

  return { status: 'done' }
}
