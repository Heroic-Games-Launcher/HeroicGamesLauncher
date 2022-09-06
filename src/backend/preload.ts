import { contextBridge } from 'electron'
import api from './api'

contextBridge.exposeInMainWorld('api', api)

// import Store from 'electron-store'
// contextBridge.exposeInMainWorld('Store', Store)
