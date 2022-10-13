import { AntiCheatInfo } from 'common/types'
import { ipcMain } from 'electron'
import { gameAnticheatInfo } from './utils'

// we use the game's `namespace` value here, it's the value that can be easily fetch by AreWeAnticheatYet
ipcMain.handle(
  'getAnticheatInfo',
  (e, appNamespace: string): AntiCheatInfo | null =>
    gameAnticheatInfo(appNamespace)
)
