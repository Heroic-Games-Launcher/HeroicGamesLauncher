import { contextBridge } from 'electron'
import { Titlebar } from 'custom-electron-titlebar'
import api from './api'

contextBridge.exposeInMainWorld('api', api)

window.addEventListener('DOMContentLoaded', () => {
  // Title bar implemenation
  // Check https://github.com/AlexTorresDev/custom-electron-titlebar/wiki
  // for more options and customization
  new Titlebar()
})
