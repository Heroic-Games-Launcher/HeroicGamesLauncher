/* eslint-disable @typescript-eslint/no-unused-vars */
import { contextBridge } from 'electron'
import api from './api'
import { isFlatpak, isSteamDeck, isSteamDeckGameMode } from 'backend/constants/environment'

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld('isSteamDeckGameMode', isSteamDeckGameMode)
contextBridge.exposeInMainWorld('isFlatpak', isFlatpak)
contextBridge.exposeInMainWorld('isSteamDeck', isSteamDeck)
contextBridge.exposeInMainWorld('platform', process.platform)

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
