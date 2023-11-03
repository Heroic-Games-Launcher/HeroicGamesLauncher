import { contextBridge } from 'electron'
import api from './api'

contextBridge.exposeInMainWorld('api', api)
contextBridge.exposeInMainWorld(
  'isSteamDeckGameMode',
  process.env.XDG_CURRENT_DESKTOP === 'gamescope'
)
