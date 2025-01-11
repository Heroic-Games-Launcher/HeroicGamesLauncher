import { existsSync, mkdirSync } from 'graceful-fs'
import { gamesConfigPath, heroicIconFolder, toolsPath } from './constants/paths'

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

export {
  currentLogFile,
  lastLogFile,
  legendaryLogFile,
  gogdlLogFile,
  nileLogFile
}
