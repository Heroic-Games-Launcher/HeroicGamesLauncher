import { addHandler } from 'backend/ipc'
import {
  getStatus,
  getLatestVersion,
  updateInfo,
  install,
  remove,
  enable,
  disable,
  isEnabled
} from './eos_overlay'

addHandler('getEosOverlayStatus', getStatus)
addHandler('getLatestEosOverlayVersion', getLatestVersion)
addHandler('updateEosOverlayInfo', updateInfo)
addHandler('installEosOverlay', install)
addHandler('removeEosOverlay', remove)
addHandler('enableEosOverlay', async (e, game) => enable(game))
addHandler('disableEosOverlay', async (e, game) => disable(game))
addHandler('isEosOverlayEnabled', async (e, game?) => isEnabled(game))
