import { ConnectivityStatus } from 'common/types'
import { ipcMain, net } from 'electron'
import { logInfo, LogPrefix } from './logger/logger'
import axios from 'axios'
import EventEmitter from 'node:events'
import { sendFrontendMessage } from './main_window'

let status: ConnectivityStatus
let abortController: AbortController
let retryTimer: NodeJS.Timeout
let retryIn = 0
const defaultTimeBetweenRetries = 5
let timeBetweenRetries = defaultTimeBetweenRetries
const connectivityEmitter = new EventEmitter()

// handle setting the status, dispatch events for backend and frontend, and trigger pings
const setStatus = (newStatus: ConnectivityStatus) => {
  logInfo(`Connectivity: ${newStatus}`, LogPrefix.Connection)

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
  sendFrontendMessage('connectivity-changed', { status, retryIn })
  connectivityEmitter.emit(status)
}

const retry = (seconds: number) => {
  retryIn = seconds
  // dispatch event with retry countdown
  sendFrontendMessage('connectivity-changed', {
    status: 'check-online',
    retryIn: seconds
  })

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
  if (process.env.CI === 'e2e') {
    setStatus('online')
    return
  }

  logInfo(`Pinging external endpoints`, LogPrefix.Connection)
  abortController = new AbortController()

  const ping1 = ping('https://github.com', abortController.signal)
  const ping2 = ping('https://store.epicgames.com', abortController.signal)
  const ping3 = ping('https://gog.com', abortController.signal)
  const ping4 = ping('https://cloudflare-dns.com/', abortController.signal)

  Promise.any([ping1, ping2, ping3, ping4])
    .then(() => {
      setStatus('online')
      abortController.abort() // abort the rest
      timeBetweenRetries = defaultTimeBetweenRetries
    })
    .catch((error) => {
      logInfo('All ping requests failed:', LogPrefix.Connection)
      logInfo(error, LogPrefix.Connection)
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

export const runOnceWhenOnline = (callback: () => unknown) => {
  if (isOnline()) {
    callback()
  } else {
    connectivityEmitter.once('online', () => callback())
  }
}

export const isOnline = () => status === 'online'
