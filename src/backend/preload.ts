import { contextBridge } from 'electron'
import { Color, Titlebar } from 'custom-electron-titlebar'
import api from './api'

contextBridge.exposeInMainWorld('api', api)

window.addEventListener('DOMContentLoaded', () => {
  // Title bar implemenation
  // Check https://github.com/AlexTorresDev/custom-electron-titlebar/wiki
  // for more options and customization
  new Titlebar({
    maximizable: true,
    minimizable: true,
    closeable: true,
    backgroundColor: Color.fromHex('#151f3d')
  })
})
