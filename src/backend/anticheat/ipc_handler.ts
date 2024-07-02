import { addHandler } from 'common/ipc/backend'
import { gameAnticheatInfo } from './utils'

// we use the game's `namespace` value here, it's the value that can be easily fetch by AreWeAnticheatYet
addHandler('getAnticheatInfo', (e, appNamespace) =>
  gameAnticheatInfo(appNamespace)
)
