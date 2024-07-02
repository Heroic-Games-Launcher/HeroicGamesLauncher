import { addHandler } from 'common/ipc/backend'
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
addHandler('enableEosOverlay', async (e, appName) => enable(appName))
addHandler('disableEosOverlay', async (e, appName) => disable(appName))
addHandler('isEosOverlayEnabled', async (e, appName) => isEnabled(appName))
