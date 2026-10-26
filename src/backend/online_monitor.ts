import { ConnectivityStatus, NetworkMode } from 'common/types'
import { net } from 'electron'
import { addListener, addHandler, sendFrontendMessage } from 'backend/ipc'
import { logInfo, LogPrefix } from './logger'
import axios from 'axios'
import EventEmitter from 'node:events'
import { backendEvents } from './backend_events'
import { getNetworkMode } from './network_mode'

let status: ConnectivityStatus
// initialized lazily in setStatus() to avoid a circular-import call at module-eval time
let mode: NetworkMode = 'auto'
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

  // keep the reported network mode fresh (it can change at any time)
  mode = getNetworkMode()

  // start pinging if needed or cancel pings
  switch (status) {
    case 'check-online':
      if (mode !== 'offline') {
        pingSites()
      }
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
  sendFrontendMessage('connectivity-changed', { status, retryIn, mode })
  connectivityEmitter.emit(status)
}

const retry = (seconds: number) => {
  // in offline mode we do not keep pinging, we just report the status
  if (getNetworkMode() === 'offline') {
    sendFrontendMessage('connectivity-changed', {
      status: 'offline',
      retryIn: 0,
      mode: 'offline'
    })
    if (retryTimer) {
      clearTimeout(retryTimer)
    }
    return
  }

  retryIn = seconds
  // dispatch event with retry countdown
  sendFrontendMessage('connectivity-changed', {
    status: 'check-online',
    retryIn: seconds,
    mode: getNetworkMode()
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
  addListener(
    'connectivity-changed',
    (event, newStatus: ConnectivityStatus): void => {
      // in offline mode we do not run connectivity detection, so we always
      // report "offline" to the frontend
      if (newStatus === 'check-online' && getNetworkMode() === 'offline') {
        setStatus('offline')
        return
      }
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
  addHandler(
    'get-connectivity-status',
    (): { status: ConnectivityStatus; retryIn: number; mode: NetworkMode } => {
      return { status, retryIn, mode }
    }
  )

  // the frontend asks for the current network mode (auto/online/offline).
  // `mode` is read lazily so the answer is always up to date.
  addHandler(
    'getForkMode',
    (): NetworkMode => getNetworkMode()
  )

  addListener('set-connectivity-online', () => {
    setStatus('online')
  })

  // keep the cached mode in sync when the user changes the setting, and
  // re-evaluate the connectivity status for the new mode
  backendEvents.on('settingChanged', ({ key }) => {
    if (key !== 'networkMode') return
    mode = getNetworkMode()
    logInfo(`Network mode changed to: ${mode}`, LogPrefix.Connection)

    switch (mode) {
      case 'offline':
        // never call out while in offline mode
        if (status !== 'offline') setStatus('offline')
        break
      case 'online':
        // the user wants online checks regardless of detection
        if (status !== 'online') setStatus('online')
        break
      default:
        // auto: follow the real connectivity detection
        setStatus(net.isOnline() ? 'check-online' : 'offline')
    }

    // let the frontend know the mode changed immediately
    sendFrontendMessage('networkMode-changed', mode)
  })
}

export const onConnectivityChange = (
  callback: (status: ConnectivityStatus) => unknown
) => {
  connectivityEmitter.on('online', () => callback('online'))
  connectivityEmitter.on('offline', () => callback('offline'))
  connectivityEmitter.on('check-online', () => callback('check-online'))
}

export const runOnceWhenOnline = (callback: () => unknown) => {
  if (isOnline()) {
    callback()
  } else {
    connectivityEmitter.once('online', () => callback())
  }
}

export const isOnline = () => status === 'online'
