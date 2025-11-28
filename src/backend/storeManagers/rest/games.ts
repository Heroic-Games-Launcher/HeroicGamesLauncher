import {
  ExecResult,
  ExtraInfo,
  GameInfo,
  GameSettings,
  InstallArgs,
  InstallPlatform,
  LaunchOption
} from 'common/types'
import { InstallResult } from 'common/types/game_manager'
import { RestPluginManifest, RestGameDetailsResponse, RestDownloadInfo } from 'common/types/rest_store'
import { GameConfig } from '../../game_config'
import { logInfo, logError, logWarning, LogPrefix, createGameLogWriter } from 'backend/logger'
import { sendGameStatusUpdate, sendProgressUpdate } from '../../utils'
import { launchGame } from '../storeManagerCommon/games'
import { RemoveArgs } from 'common/types/game_manager'
import type LogWriter from 'backend/logger/log_writer'
import axios, { AxiosInstance } from 'axios'
import { getRestPluginManifest, getRestPluginConfig } from './config'
import { restLibraryStore, restInstalledGamesStore } from './electronStores'
import { existsSync, rmSync, mkdirSync, statSync, readdirSync, lstatSync } from 'graceful-fs'
import { createWriteStream } from 'node:fs'
import { dirname, join, basename, extname } from 'path'
import { pipeline } from 'stream/promises'
import type { AxiosProgressEvent } from 'axios'
import i18next from 'i18next'
import { notify } from '../../dialog/dialog'
import { spawnAsync, extractFiles } from '../../utils'
import {
  addShortcuts as addShortcutsUtil,
  removeShortcuts as removeShortcutsUtil
} from '../../shortcuts/shortcuts/shortcuts'
import { removePrefix } from 'backend/utils/uninstaller'
import { removeRecentGame } from 'backend/recent_games/recent_games'
import { isLinux, isMac, isWindows } from 'backend/constants/environment'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import { killPattern, shutdownWine, checkWineBeforeLaunch } from '../../utils'
import { runWineCommand, verifyWinePrefix } from '../../launcher'
import { getRunnerLogWriter } from 'backend/logger'

// Plugin-specific HTTP clients
const pluginClients = new Map<string, AxiosInstance>()

function getPluginClient(pluginId: string): AxiosInstance {
  if (!pluginClients.has(pluginId)) {
    const config = getRestPluginConfig(pluginId)
    if (!config) {
      throw new Error(`Plugin ${pluginId} not configured`)
    }

    const manifest = getRestPluginManifest(pluginId)
    const client = axios.create({
      baseURL: manifest.baseUrl,
      timeout: 30000
    })

    // Add auth if configured
    if (manifest.auth?.type === 'bearer' && config.token) {
      const header = manifest.auth.tokenHeader || 'Authorization'
      client.defaults.headers.common[header] = `Bearer ${config.token}`
    }

    pluginClients.set(pluginId, client)
  }
  return pluginClients.get(pluginId)!
}

function getPluginIdFromAppName(appName: string): string {
  // Format: "rest:pluginId:gameId"
  const parts = appName.split(':')
  if (parts.length >= 3 && parts[0] === 'rest') {
    return parts[1]
  }
  throw new Error(`Invalid REST app name format: ${appName}`)
}

function getGameIdFromAppName(appName: string): string {
  const parts = appName.split(':')
  if (parts.length >= 3 && parts[0] === 'rest') {
    return parts.slice(2).join(':')
  }
  throw new Error(`Invalid REST app name format: ${appName}`)
}

export function getGameInfo(appName: string): GameInfo {
  const games = restLibraryStore.get('games', [])
  const game = games.find((g: GameInfo) => g.app_name === appName)
  if (!game) {
    throw new Error(`Game ${appName} not found`)
  }
  return game
}

export async function getSettings(appName: string): Promise<GameSettings> {
  return (
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  )
}

export async function getExtraInfo(appName: string): Promise<ExtraInfo> {
  try {
    const pluginId = getPluginIdFromAppName(appName)
    const gameId = getGameIdFromAppName(appName)
    const manifest = getRestPluginManifest(pluginId)
    const client = getPluginClient(pluginId)

    const endpoint = manifest.endpoints.game.replace(':id', gameId)
    const response = await client.get<RestGameDetailsResponse>(endpoint)

    return {
      about: response.data.extra?.about,
      reqs: (response.data.extra?.reqs || []).map((req: { name: string; minimum?: string; recommended?: string }) => ({
        title: req.name,
        minimum: req.minimum || '',
        recommended: req.recommended || ''
      })),
      releaseDate: response.data.releaseDate,
      storeUrl: response.data.store_url,
      changelog: response.data.extra?.changelog,
      genres: response.data.genres
    }
  } catch (error) {
    logError(`Failed to get extra info for ${appName}: ${error}`, LogPrefix.RestStore)
    return { reqs: [] }
  }
}

// Helper function to recursively find a file in a directory
function findFileInDirectory(dir: string, filename: string, maxDepth: number = 3, currentDepth: number = 0): string | null {
  if (currentDepth > maxDepth) {
    return null
  }
  
  try {
    if (!existsSync(dir)) {
      return null
    }
    
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      
      try {
        const stat = lstatSync(fullPath)
        
        if (stat.isFile() && entry.toLowerCase() === filename.toLowerCase()) {
          return fullPath
        }
        
        if (stat.isDirectory() && currentDepth < maxDepth) {
          const found = findFileInDirectory(fullPath, filename, maxDepth, currentDepth + 1)
          if (found) {
            return found
          }
        }
      } catch (err) {
        // Skip entries we can't access
        continue
      }
    }
  } catch (err) {
    // Can't read directory
    return null
  }
  
  return null
}

async function downloadAndInstall(
  downloadInfo: RestDownloadInfo,
  installPath: string,
  appName: string
) {
  logInfo(`Downloading ${appName} to ${installPath}`, LogPrefix.RestStore)
  
  // Ensure install directory exists
  mkdirSync(installPath, { recursive: true })
  
  // Determine filename from URL or use a default - strip query parameters
  const urlParts = downloadInfo.url.split('/')
  let filename = basename(urlParts[urlParts.length - 1]) || `${appName}.zip`
  // Remove query parameters from filename
  filename = filename.split('?')[0]
  // If no extension, assume it's a zip
  if (!extname(filename)) {
    filename = `${filename}.zip`
  }
  const downloadPath = join(installPath, filename)
  
  // Track progress for speed calculation - throttle to 1 second
  let lastProgressUpdateTime = Date.now()
  let lastBytesLoaded = 0
  
  try {
    // Download the file
    const response = await axios.get(downloadInfo.url, {
      responseType: 'stream',
      headers: downloadInfo.headers || {},
      onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          const bytes = progressEvent.loaded
          const currentTime = Date.now()
          const timeElapsed = currentTime - lastProgressUpdateTime
          
          // Only calculate and send progress updates every second (throttle)
          if (timeElapsed >= 1000) {
            const bytesLoadedSinceLastUpdate = bytes - lastBytesLoaded
            const speedBytesPerSecond = bytesLoadedSinceLastUpdate / (timeElapsed / 1000) // Bytes per second
            // Convert bytes/s to MB/s (divide by 1024 * 1024)
            const speedMBPerSecond = speedBytesPerSecond / (1024 * 1024)
            
            // Update tracking
            lastProgressUpdateTime = currentTime
            lastBytesLoaded = bytes
            
            sendProgressUpdate({
              appName,
              runner: 'rest',
              status: 'installing',
              progress: {
                bytes: String(bytes),
                eta: '',
                percent,
                downSpeed: speedMBPerSecond, // Download speed in MB/s (only during download)
                diskSpeed: undefined // Not applicable during download
              }
            })
          }
          
          onInstallOrUpdateOutput(
            appName,
            'installing',
            `Downloading: ${percent}%`,
            downloadInfo.size
          )
        }
      }
    })
    
    // Write file to disk
    await pipeline(response.data, createWriteStream(downloadPath))
    logInfo(`Downloaded ${appName} to ${downloadPath}`, LogPrefix.RestStore)
    
    // TODO: Handle extraction if needed (based on file type)
    // For now, we assume the file is ready to use or needs manual extraction
    
  } catch (error) {
    logError(`Failed to download ${appName}: ${error}`, LogPrefix.RestStore)
    throw error
  }
}

async function executeInstallStep(
  step: NonNullable<RestDownloadInfo['steps']>[0],
  installPath: string,
  appName: string,
  extractionDestination?: string
) {
  logInfo(`Executing step: ${step.type} for ${appName}`, LogPrefix.RestStore)
  
  switch (step.type) {
    case 'download': {
      if (!step.url) {
        throw new Error('Download step requires a URL')
      }
      
      // Ensure install directory exists
      mkdirSync(installPath, { recursive: true })
      
      // Determine filename from URL - strip query parameters
      const urlParts = step.url.split('/')
      let filename = basename(urlParts[urlParts.length - 1]) || `${appName}.zip`
      // Remove query parameters from filename
      filename = filename.split('?')[0]
      // If no extension, assume it's a zip
      if (!extname(filename)) {
        filename = `${filename}.zip`
      }
      const downloadPath = join(installPath, filename)
      
      // Track progress for speed calculation - throttle to 1 second
      let lastProgressUpdateTime = Date.now()
      let lastBytesLoaded = 0
      
      try {
        const response = await axios.get(step.url, {
          responseType: 'stream',
          onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
              const bytes = progressEvent.loaded
              const currentTime = Date.now()
              const timeElapsed = currentTime - lastProgressUpdateTime
              
              // Only calculate and send progress updates every second (throttle)
              if (timeElapsed >= 1000) {
                const bytesLoadedSinceLastUpdate = bytes - lastBytesLoaded
                const speedBytesPerSecond = bytesLoadedSinceLastUpdate / (timeElapsed / 1000) // Bytes per second
                // Convert bytes/s to MB/s (divide by 1024 * 1024)
                const speedMBPerSecond = speedBytesPerSecond / (1024 * 1024)
                
                // Update tracking
                lastProgressUpdateTime = currentTime
                lastBytesLoaded = bytes
                
                sendProgressUpdate({
                  appName,
                  runner: 'rest',
                  status: 'installing',
                  progress: {
                    bytes: String(bytes),
                    eta: '',
                    percent,
                    downSpeed: speedMBPerSecond, // Download speed in MB/s (only during download)
                    diskSpeed: undefined // Not applicable during download
                  }
                })
              }
              
              onInstallOrUpdateOutput(
                appName,
                'installing',
                `Downloading: ${percent}%`,
                progressEvent.total
              )
            }
          }
        })
        
        await pipeline(response.data, createWriteStream(downloadPath))
        logInfo(`Downloaded file to ${downloadPath}`, LogPrefix.RestStore)
      } catch (error) {
        logError(`Failed to download file from ${step.url}: ${error}`, LogPrefix.RestStore)
        throw error
      }
      break
    }
    case 'extract': {
      const sourcePath = step.source || join(installPath, `${appName}.zip`)
      const destPath = step.destination || installPath
      
      if (!existsSync(sourcePath)) {
        throw new Error(`Source file does not exist: ${sourcePath}`)
      }
      
      logInfo(`Extracting ${sourcePath} to ${destPath}`, LogPrefix.RestStore)
      mkdirSync(destPath, { recursive: true })
      
      // Get source file size for progress tracking
      const sourceSize = statSync(sourcePath).size
      
      const fileExt = extname(sourcePath).toLowerCase()
      
      try {
        if (fileExt === '.zip') {
          // Send progress update indicating extraction is starting
          sendProgressUpdate({
            appName,
            runner: 'rest',
            status: 'installing',
            progress: {
              bytes: String(sourceSize),
              eta: '',
              percent: 0,
              downSpeed: undefined, // Not applicable during extraction
              diskSpeed: undefined // Will be tracked if possible
            }
          })
          
          // Use unzip command for zip files
          const { code, stderr } = await spawnAsync('unzip', [
            '-o', // Overwrite files without prompting
            '-q', // Quiet mode
            sourcePath,
            '-d',
            destPath
          ])
          
          if (code !== 0) {
            throw new Error(`Unzip failed: ${stderr}`)
          }
          
          // Send progress update indicating extraction is complete
          sendProgressUpdate({
            appName,
            runner: 'rest',
            status: 'installing',
            progress: {
              bytes: String(sourceSize),
              eta: '',
              percent: 100,
              downSpeed: undefined, // Not applicable during extraction
              diskSpeed: undefined // Extraction complete
            }
          })
          
          logInfo(`Extracted ${sourcePath} to ${destPath}`, LogPrefix.RestStore)
          
          // Delete the zip file after successful extraction
          try {
            rmSync(sourcePath)
            logInfo(`Deleted archive file: ${sourcePath}`, LogPrefix.RestStore)
          } catch (deleteError) {
            logWarning(`Failed to delete archive file ${sourcePath}: ${deleteError}`, LogPrefix.RestStore)
            // Don't throw - extraction was successful, deletion is just cleanup
          }
        } else if (sourcePath.includes('.tar')) {
          // Send progress update indicating extraction is starting
          sendProgressUpdate({
            appName,
            runner: 'rest',
            status: 'installing',
            progress: {
              bytes: String(sourceSize),
              eta: '',
              percent: 0,
              downSpeed: undefined, // Not applicable during extraction
              diskSpeed: undefined // Will be tracked if possible
            }
          })
          
          // Use extractFiles for tar files
          const result = await extractFiles({
            path: sourcePath,
            destination: destPath,
            strip: 0
          })
          
          if (result.status === 'error') {
            throw new Error(result.error || 'Extraction failed')
          }
          
          // Send progress update indicating extraction is complete
          sendProgressUpdate({
            appName,
            runner: 'rest',
            status: 'installing',
            progress: {
              bytes: String(sourceSize),
              eta: '',
              percent: 100,
              downSpeed: undefined, // Not applicable during extraction
              diskSpeed: undefined // Extraction complete
            }
          })
          
          logInfo(`Extracted ${sourcePath} to ${destPath}`, LogPrefix.RestStore)
          
          // Delete the tar file after successful extraction
          try {
            rmSync(sourcePath)
            logInfo(`Deleted archive file: ${sourcePath}`, LogPrefix.RestStore)
          } catch (deleteError) {
            logWarning(`Failed to delete archive file ${sourcePath}: ${deleteError}`, LogPrefix.RestStore)
            // Don't throw - extraction was successful, deletion is just cleanup
          }
        } else {
          throw new Error(`Unsupported archive format: ${fileExt}`)
        }
      } catch (error) {
        logError(`Failed to extract ${sourcePath}: ${error}`, LogPrefix.RestStore)
        throw error
      }
      break
    }
    case 'execute': {
      if (!step.command) {
        throw new Error('Execute step requires a command')
      }
      
      let command = step.command
      const args = step.args || []
      // Use extraction destination as working directory if available, otherwise use install path
      // Resolve path in case it's relative
      let workingDir = extractionDestination 
        ? (extractionDestination.startsWith('/') ? extractionDestination : join(installPath, extractionDestination))
        : installPath
      
      // If command is just a filename (like "setup.exe"), search for it in the working directory
      // This handles cases where setup.exe is in a subfolder
      if (command && !command.includes('/') && !command.includes('\\')) {
        const commandPath = join(workingDir, command)
        if (!existsSync(commandPath)) {
          // Search for the file in subdirectories
          const foundPath = findFileInDirectory(workingDir, command, 3)
          if (foundPath) {
            logInfo(`Found ${command} at ${foundPath} (was looking in ${workingDir})`, LogPrefix.RestStore)
            // Update working directory to the directory containing the file
            workingDir = dirname(foundPath)
            // Use just the filename for the command
            command = basename(foundPath)
          } else {
            logWarning(`Could not find ${command} in ${workingDir} or subdirectories`, LogPrefix.RestStore)
          }
        }
      }
      
      logInfo(`Executing ${command} ${args.join(' ')} in ${workingDir}`, LogPrefix.RestStore)
      
      try {
        // Check if this is a Windows executable (.exe, .bat, .msi, etc.)
        const isWindowsExecutable = /\.(exe|bat|cmd|msi|msm)$/i.test(command)
        
        if (isWindowsExecutable && !isWindows) {
          // Use Wine/Proton to run Windows executables on Linux/Mac
          const gameSettings = await getSettings(appName)
          const gameInfo = getGameInfo(appName)
          
          // Check Wine before launch
          const logWriter = getRunnerLogWriter('rest')
          const isWineOk = await checkWineBeforeLaunch(
            gameInfo,
            gameSettings,
            logWriter
          )
          
          if (!isWineOk) {
            throw new Error('Wine/Proton is not available or not properly configured')
          }
          
          // Verify Wine prefix
          await verifyWinePrefix(gameSettings)
          
          // Run Windows executable through Wine
          const result = await runWineCommand({
            gameSettings,
            gameInstallPath: installPath,
            commandParts: [command, ...args],
            wait: true,
            protonVerb: 'run',
            startFolder: workingDir,
            options: {
              logMessagePrefix: `Installing ${appName}`,
              logWriters: [await createGameLogWriter(appName, 'rest', 'install')],
              abortId: appName
            }
          })
          
          if (result.code !== 0) {
            if (step.optional) {
              logWarning(`Wine command failed with code ${result.code} but step is optional: ${result.stderr}`, LogPrefix.RestStore)
              logWarning(`Continuing installation despite optional step failure`, LogPrefix.RestStore)
            } else {
              logError(`Wine command failed with code ${result.code}: ${result.stderr}`, LogPrefix.RestStore)
              throw new Error(`Command execution failed: ${result.stderr || result.stdout}`)
            }
          } else {
            logInfo(`Command executed successfully through Wine: ${command}`, LogPrefix.RestStore)
          }
        } else {
          // Native command execution (Linux/Mac executables or Windows on Windows)
          const { code, stderr, stdout } = await spawnAsync(command, args, {
            cwd: workingDir
          })
          
          if (code !== 0) {
            if (step.optional) {
              logWarning(`Command failed with code ${code} but step is optional: ${stderr}`, LogPrefix.RestStore)
              logWarning(`Continuing installation despite optional step failure`, LogPrefix.RestStore)
            } else {
              logError(`Command failed with code ${code}: ${stderr}`, LogPrefix.RestStore)
              throw new Error(`Command execution failed: ${stderr || stdout}`)
            }
          } else {
            logInfo(`Command executed successfully: ${command}`, LogPrefix.RestStore)
          }
        }
      } catch (error) {
        if (step.optional) {
          logWarning(`Failed to execute ${command} but step is optional: ${error}`, LogPrefix.RestStore)
          logWarning(`Continuing installation despite optional step failure`, LogPrefix.RestStore)
        } else {
          logError(`Failed to execute ${command}: ${error}`, LogPrefix.RestStore)
          throw error
        }
      }
      break
    }
    case 'copy': {
      if (!step.source || !step.destination) {
        throw new Error('Copy step requires source and destination')
      }
      logWarning('Copy step not yet implemented', LogPrefix.RestStore)
      // TODO: Implement file copying
      break
    }
  }
}

export async function install(
  appName: string,
  args: InstallArgs
): Promise<InstallResult> {
  try {
    sendGameStatusUpdate({
      appName,
      runner: 'rest',
      status: 'installing'
    })

    const pluginId = getPluginIdFromAppName(appName)
    const gameId = getGameIdFromAppName(appName)
    const manifest = getRestPluginManifest(pluginId)
    const client = getPluginClient(pluginId)

    // Get download info
    const downloadsEndpoint = manifest.endpoints.downloads.replace(':id', gameId)
    const downloadResponse = await client.get<RestDownloadInfo>(downloadsEndpoint, {
      params: {
        platform: args.platformToInstall,
        path: args.path
      }
    })

    const downloadInfo = downloadResponse.data

    // Execute installation steps
    let lastExtractionDestination: string | undefined
    if (downloadInfo.steps) {
      for (const step of downloadInfo.steps) {
        // Track extraction destination for use in subsequent execute steps
        if (step.type === 'extract' && step.destination) {
          lastExtractionDestination = step.destination
        }
        // Use extraction destination as working directory for execute steps
        await executeInstallStep(step, args.path, appName, lastExtractionDestination)
      }
    } else {
      // Default: download and extract
      await downloadAndInstall(downloadInfo, args.path, appName)
    }

    // Update installed games store
    const installed = restInstalledGamesStore.get('installed', [])
    const gameInfo = getGameInfo(appName)
    installed.push({
      appName,
      install_path: args.path,
      platform: args.platformToInstall,
      version: gameInfo.version || 'unknown',
      executable: gameInfo.install.executable || '',
      install_size: String(downloadInfo.size),
      is_dlc: false
    })
    restInstalledGamesStore.set('installed', installed)

    sendGameStatusUpdate({
      appName,
      runner: 'rest',
      status: 'done'
    })

    notify({
      title: gameInfo.title,
      body: i18next.t('notify.installed', 'Game Installed')
    })

    return { status: 'done' }
  } catch (error) {
    logError(`Install failed for ${appName}: ${error}`, LogPrefix.RestStore)
    sendGameStatusUpdate({
      appName,
      runner: 'rest',
      status: 'error'
    })
    return { status: 'error', error: String(error) }
  }
}

export function onInstallOrUpdateOutput(
  appName: string,
  action: 'installing' | 'updating',
  data: string,
  totalDownloadSize: number
) {
  // Parse progress from data and send updates
  logInfo(`[${action}] ${appName}: ${data}`, LogPrefix.RestStore)
  // TODO: Parse progress and send updates via sendProgressUpdate
}

export async function launch(
  appName: string,
  logWriter: LogWriter,
  launchArguments?: LaunchOption,
  args: string[] = []
): Promise<boolean> {
  const gameInfo = getGameInfo(appName)
  return launchGame(appName, logWriter, gameInfo, 'rest', args)
}

export async function stop(appName: string, stopWine?: boolean): Promise<void> {
  const {
    install: { executable = undefined }
  } = getGameInfo(appName)

  if (executable) {
    const split = executable.split('/')
    const exe = split[split.length - 1]
    killPattern(exe)

    if (!isNative(appName) && stopWine) {
      const gameSettings = await getSettings(appName)
      shutdownWine(gameSettings)
    }
  }
}

export async function uninstall({
  appName,
  shouldRemovePrefix,
  deleteFiles = false
}: RemoveArgs): Promise<ExecResult> {
  sendGameStatusUpdate({
    appName,
    runner: 'rest',
    status: 'uninstalling'
  })

  const installed = restInstalledGamesStore.get('installed', [])
  const current = installed.filter((i) => i.appName !== appName)
  restInstalledGamesStore.set('installed', current)

  const gameInfo = getGameInfo(appName)
  const {
    title,
    install: { executable }
  } = gameInfo

  if (shouldRemovePrefix) {
    removePrefix(appName, 'rest')
  }

  if (deleteFiles && executable !== undefined) {
    rmSync(dirname(executable), { recursive: true })
  }

  notify({ title, body: i18next.t('notify.uninstalled') })

  removeShortcutsUtil(gameInfo)
  removeRecentGame(appName)
  removeNonSteamGame({ gameInfo })

  sendGameStatusUpdate({
    appName,
    runner: 'rest',
    status: 'done'
  })

  logInfo('finished uninstalling', LogPrefix.RestStore)
  return { stderr: '', stdout: '' }
}

export function isNative(appName: string): boolean {
  const {
    install: { platform }
  } = getGameInfo(appName)
  if (platform) {
    if (platform === 'Browser') {
      return true
    }

    if (isWindows) {
      return true
    }

    if (isMac && platform === 'Mac') {
      return true
    }

    const plat = platform.toLowerCase()
    if (isLinux && plat === 'linux') {
      return true
    }
  }

  return false
}

export async function addShortcuts(
  appName: string,
  fromMenu?: boolean
): Promise<void> {
  return addShortcutsUtil(getGameInfo(appName), fromMenu)
}

export async function removeShortcuts(appName: string): Promise<void> {
  return removeShortcutsUtil(getGameInfo(appName))
}

export async function importGame(
  appName: string,
  path: string,
  platform: InstallPlatform
): Promise<ExecResult> {
  // TODO: Implement import logic
  return { stderr: '', stdout: '' }
}

export async function update(
  appName: string,
  updateOverwrites?: {
    build?: string
    branch?: string
    language?: string
    dlcs?: string[]
    dependencies?: string[]
  }
): Promise<InstallResult> {
  // For now, treat update as install
  const gameInfo = getGameInfo(appName)
  return install(appName, {
    path: gameInfo.install.install_path || '',
    platformToInstall: gameInfo.install.platform || 'Windows'
  })
}

export async function moveInstall(
  appName: string,
  newInstallPath: string
): Promise<InstallResult> {
  // TODO: Implement move logic
  logWarning(`moveInstall not fully implemented for REST store`, LogPrefix.RestStore)
  return { status: 'error', error: 'Not implemented' }
}

export async function repair(appName: string): Promise<ExecResult> {
  // TODO: Implement repair logic
  logWarning(`repair not fully implemented for REST store`, LogPrefix.RestStore)
  return { stderr: '', stdout: '' }
}

export async function syncSaves(
  appName: string,
  arg: string,
  path: string
): Promise<string> {
  // TODO: Implement save sync if plugin supports it
  logWarning(`syncSaves not fully implemented for REST store`, LogPrefix.RestStore)
  return ''
}

export async function forceUninstall(appName: string): Promise<void> {
  await uninstall({ appName, shouldRemovePrefix: true, deleteFiles: true })
}

export async function isGameAvailable(appName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const { install } = getGameInfo(appName)

    if (install && install.platform === 'Browser') {
      resolve(true)
    }

    if (install && install.executable) {
      resolve(existsSync(install.executable))
    }

    resolve(false)
  })
}

