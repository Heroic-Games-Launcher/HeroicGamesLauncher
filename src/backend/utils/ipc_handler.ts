import { clipboard } from 'electron'
import { addListener, addHandler } from 'common/ipc/backend'
import { callAbortController } from './aborthandler/aborthandler'
import {
  getGogdlVersion,
  getLegendaryVersion,
  getNileVersion
} from './helperBinaries'
import { hasExecutable } from './os/path'
import { formatSystemInfo, getSystemInfo } from './systeminfo'

addListener('abort', async (event, id) => {
  callAbortController(id)
})
addHandler('getLegendaryVersion', getLegendaryVersion)
addHandler('getGogdlVersion', getGogdlVersion)
addHandler('getNileVersion', getNileVersion)
addHandler('getSystemInfo', async (e, cache) => getSystemInfo(cache))
addListener('copySystemInfoToClipboard', async () =>
  getSystemInfo().then(formatSystemInfo).then(clipboard.writeText)
)
addHandler('hasExecutable', async (event, executable) => {
  return hasExecutable(executable)
})
