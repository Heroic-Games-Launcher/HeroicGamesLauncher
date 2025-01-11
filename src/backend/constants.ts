import { spawnSync } from 'child_process'
import { join } from 'path'
import { parse } from '@node-steam/vdf'

import { GameConfigVersion, GlobalConfigVersion } from 'common/types'
import { logDebug, LogPrefix } from './logger/logger'
import { existsSync, mkdirSync, readFileSync } from 'graceful-fs'
import { GlobalConfig } from './config'
import {
  gamesConfigPath,
  heroicIconFolder,
  toolsPath,
  userHome
} from './constants/paths'
import { isMac, isWindows } from './constants/environment'

const currentGameConfigVersion: GameConfigVersion = 'v0'
const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'

const {
  currentLogFile,
  lastLogFile,
  legendaryLogFile,
  gogdlLogFile,
  nileLogFile
} = {
  currentLogFile: '',
  lastLogFile: '',
  legendaryLogFile: '',
  gogdlLogFile: '',
  nileLogFile: ''
} //createNewLogFileAndClearOldOnes()

/**
 * Get shell for different os
 * @returns Windows: powershell
 * @returns unix: $SHELL or /usr/bin/bash
 */
function getShell() {
  // Dont change this logic since Heroic will break when using SH or FISH
  switch (process.platform) {
    case 'win32':
      return 'powershell.exe'
    case 'linux':
      return '/bin/bash'
    case 'darwin':
      return '/bin/zsh'
    default:
      return '/bin/bash'
  }
}

export function getSteamCompatFolder() {
  // Paths are from https://savelocation.net/steam-game-folder
  if (isWindows) {
    const defaultWinPath = join(process.env['PROGRAMFILES(X86)'] ?? '', 'Steam')
    return defaultWinPath
  } else if (isMac) {
    return join(userHome, 'Library/Application Support/Steam')
  } else {
    const flatpakSteamPath = join(
      userHome,
      '.var/app/com.valvesoftware.Steam/.steam/steam'
    )

    if (existsSync(flatpakSteamPath)) {
      // check if steam is really installed via flatpak
      const { status } = spawnSync('flatpak', [
        'info',
        'com.valvesoftware.Steam'
      ])

      if (status === 0) {
        return flatpakSteamPath
      }
    }
    return join(userHome, '.steam/steam')
  }
}

export async function getSteamLibraries(): Promise<string[]> {
  const { defaultSteamPath } = GlobalConfig.get().getSettings()
  const path = defaultSteamPath.replaceAll("'", '')
  const vdfFile = join(path, 'steamapps', 'libraryfolders.vdf')
  const libraries = ['/usr/share/steam']

  if (existsSync(vdfFile)) {
    const json = parse(readFileSync(vdfFile, 'utf-8'))
    if (!json.libraryfolders) {
      return libraries
    }
    const folders: { path: string }[] = Object.values(json.libraryfolders)
    return [...libraries, ...folders.map((folder) => folder.path)].filter(
      (path) => existsSync(path)
    )
  }
  logDebug(
    'Unable to load Steam Libraries, libraryfolders.vdf not found',
    LogPrefix.Backend
  )
  return libraries
}

const MAX_BUFFER = 25 * 1024 * 1024 // 25MB should be safe enough for big installations even on really slow internet

const execOptions = {
  maxBuffer: MAX_BUFFER,
  shell: getShell()
}

const defaultFolders = [gamesConfigPath, heroicIconFolder]

const necessaryFoldersByPlatform = {
  win32: [...defaultFolders],
  linux: [...defaultFolders, toolsPath],
  darwin: [...defaultFolders, toolsPath]
}

export function createNecessaryFolders() {
  necessaryFoldersByPlatform[process.platform].forEach((folder: string) => {
    if (!existsSync(folder)) {
      mkdirSync(folder)
    }
  })
}

export {
  currentGameConfigVersion,
  currentGlobalConfigVersion,
  currentLogFile,
  lastLogFile,
  legendaryLogFile,
  gogdlLogFile,
  nileLogFile,
  execOptions
}
