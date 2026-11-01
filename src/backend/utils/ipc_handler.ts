import { clipboard } from 'electron'
import { addListener, addHandler } from 'backend/ipc'

import { callAbortController } from './aborthandler/aborthandler'
import {
  getCometVersion,
  getGogdlVersion,
  getLegendaryVersion,
  getNileVersion
} from './helperBinaries'
import { hasExecutable } from './os/path'
import { formatSystemInfo, getSystemInfo } from './systeminfo'
import { getWindowsDisplayDevices } from './graphics/windows_hide_gpu'
import { isIntelMac } from 'backend/constants/environment'

addListener('abort', (event, id) => {
  callAbortController(id)
})
addHandler('getLegendaryVersion', getLegendaryVersion)
addHandler('getGogdlVersion', getGogdlVersion)
addHandler('getCometVersion', getCometVersion)
addHandler('getNileVersion', getNileVersion)
addHandler('getSystemInfo', async (e, cache) => getSystemInfo(cache))
addHandler('getWindowsDisplayDevices', getWindowsDisplayDevices)
addListener('copySystemInfoToClipboard', async () => {
  const info = await getSystemInfo()
  const formatted = await formatSystemInfo(info)
  clipboard.writeText(formatted)
})
addHandler('hasExecutable', async (event, executable) => {
  return hasExecutable(executable)
})

addHandler('isIntelMac', () => {
  return isIntelMac
})
