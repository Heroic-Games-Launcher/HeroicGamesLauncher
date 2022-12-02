import { ConnectivityStatus } from 'common/types'
import { BrowserWindow, ipcMain, net } from 'electron'
import { logInfo, LogPrefix } from './logger/logger'
import axios from 'axios'
import EventEmitter from 'node:events'

let status: ConnectivityStatus
let abortController: AbortController
let retryTimer: NodeJS.Timeout
let retryIn = 0
const defaultTimeBetweenRetries = 5
let timeBetweenRetries = defaultTimeBetweenRetries
export const connectivityEmitter = new EventEmitter()

// handle setting the status, dispatch events for backend and frontend, and trigger pings
const setStatus = (newStatus: ConnectivityStatus) => {
  logInfo(`Connectivity: ${newStatus}`, { prefix: LogPrefix.Connection })

  status = newStatus

  // start pinging if needed or cancel pings
  switch (status) {
    case 'check-online':
      pingSites()
      break
    default:
      retryIn = 0
      timeBetweenRetries = defaultTimeBetweenRetries
      if (abortController) {
        abortController.abort()
      }
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
  }

  // events
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    mainWindow.webContents.send('connectivity-changed', { status, retryIn })
  }
  connectivityEmitter.emit(status)
}

const retry = (seconds: number) => {
  retryIn = seconds
  // logInfo(`Retrying in: ${retryIn} seconds`, { prefix: LogPrefix.Connection })
  // dispatch event with retry countdown
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    mainWindow.webContents.send('connectivity-changed', {
      status: 'check-online',
      retryIn: seconds
    })
  }

  if (seconds) {
    // if still counting down, repeat
    if (retryTimer) {
      clearTimeout(retryTimer)
    }
    retryTimer = setTimeout(() => retry(seconds - 1), 1000)
  } else {
    // else, retry pings
    pingSites()
  }
}

const ping = async (url: string, signal: AbortSignal) => {
  return axios.head(url, {
    timeout: 10000,
    signal,
    headers: { 'Cache-Control': 'no-cache' }
  })
}

const pingSites = () => {
  logInfo(`Pinging external endpoints`, { prefix: LogPrefix.Connection })
  abortController = new AbortController()

  const ping1 = ping('https://github.com', abortController.signal)
  const ping2 = ping('https://store.epicgames.com', abortController.signal)
  const ping3 = ping('https://gog.com', abortController.signal)

  Promise.any([ping1, ping2, ping3])
    .then(() => {
      setStatus('online')
      abortController.abort() // abort the rest
      timeBetweenRetries = defaultTimeBetweenRetries
    })
    .catch((error) => {
      logInfo('All ping requests failed:', { prefix: LogPrefix.Connection })
      logInfo(error, { prefix: LogPrefix.Connection })
      retry(timeBetweenRetries)
      timeBetweenRetries = timeBetweenRetries + defaultTimeBetweenRetries
    })
}

export const initOnlineMonitor = () => {
  // listen to events from the frontend
  ipcMain.on(
    'connectivity-changed',
    (event, newStatus: ConnectivityStatus): void => {
      setStatus(newStatus)
    }
  )

  if (net.isOnline()) {
    // set initial status and ping external sites
    setStatus('check-online')
  } else {
    setStatus('offline')
  }

  // listen to the frontend asking for current status
  ipcMain.handle(
    'get-connectivity-status',
    (): { status: ConnectivityStatus; retryIn: number } => {
      return { status, retryIn }
    }
  )

  ipcMain.on('set-connectivity-online', () => {
    setStatus('online')
  })
}

export const makeNetworkRequest = (callback: () => unknown) => {
  if (isOnline()) {
    callback()
  }
}

export const runOnceWhenOnline = (callback: () => unknown) => {
  if (isOnline()) {
    callback()
  } else {
    connectivityEmitter.once('online', () => callback())
  }
}

export const isOnline = () => status === 'online'

// use this function to trigger the connectivity check when detecting an external request failing
export const checkConnectivity = () => {
  setStatus('check-online')
}
