import { existsSync, mkdirSync } from 'graceful-fs'
import { gamesConfigPath, heroicIconFolder, toolsPath } from './constants/paths'

export function createNecessaryFolders() {
  const defaultFolders = [gamesConfigPath, heroicIconFolder]

  const necessaryFoldersByPlatform = {
    win32: [...defaultFolders],
    linux: [...defaultFolders, toolsPath],
    darwin: [...defaultFolders, toolsPath]
  }

  necessaryFoldersByPlatform[process.platform].forEach((folder: string) => {
    if (!existsSync(folder)) {
      mkdirSync(folder)
    }
  })
}
