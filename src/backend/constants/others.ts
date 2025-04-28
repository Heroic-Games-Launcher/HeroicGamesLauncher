import { GameConfigVersion, GlobalConfigVersion } from 'common/types'

export const currentGameConfigVersion: GameConfigVersion = 'v0'
export const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'

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

const MAX_BUFFER = 25 * 1024 * 1024 // 25MB should be safe enough for big installations even on really slow internet

export const execOptions = {
  maxBuffer: MAX_BUFFER,
  shell: getShell()
}
