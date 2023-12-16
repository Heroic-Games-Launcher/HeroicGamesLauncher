/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { contextBridge } from 'electron'
import api from './api'

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld(
  'isSteamDeckGameMode',
  process.env.XDG_CURRENT_DESKTOP === 'gamescope'
)

if (navigator.userAgent.includes('Windows')) {
  Object.defineProperty(navigator, 'platform', {
    get: function () {
      return 'Win32'
    },
    set: function (a) {}
  })

  Object.defineProperty(navigator, 'userAgentData', {
    get: function () {
      return null
    },
    set: function (a) {}
  })
}
