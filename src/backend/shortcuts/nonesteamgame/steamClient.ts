import axios from 'axios'
import { existsSync } from 'graceful-fs'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { logWarning, LogPrefix } from 'backend/logger'

/**
 * Talks to a running Steam client through its CEF remote debugging
 * interface (the same mechanism used by Valve's steamos-devkit and by
 * Decky Loader). This allows managing non-steam shortcuts while Steam
 * is running, which is the only way to do it on SteamOS Game Mode.
 *
 * The interface is only available when the flag file
 * `.cef-enable-remote-debugging` exists in the Steam install folder
 * when Steam starts.
 */

const CEF_DEBUGGER_URL = 'http://127.0.0.1:8080'
const EVAL_TIMEOUT_MS = 10000
const SOCKET_URL_CACHE_MS = 5000

let cachedSocketUrl: { url: string; fetchedAt: number } | null = null

interface SteamClientShortcut {
  appid: number
  appName: string
  exe: string
  launchOptions: string
}

interface CEFTarget {
  title: string
  webSocketDebuggerUrl: string
}

async function getSharedJSContextSocketUrl(): Promise<string | null> {
  if (
    cachedSocketUrl &&
    Date.now() - cachedSocketUrl.fetchedAt < SOCKET_URL_CACHE_MS
  ) {
    return cachedSocketUrl.url
  }

  try {
    const { data } = await axios.get<CEFTarget[]>(`${CEF_DEBUGGER_URL}/json`, {
      timeout: 3000
    })
    if (!Array.isArray(data)) {
      return null
    }
    const target = data.find((target) => target.title === 'SharedJSContext')
    const url = target?.webSocketDebuggerUrl ?? null
    cachedSocketUrl = url ? { url, fetchedAt: Date.now() } : null
    return url
  } catch {
    cachedSocketUrl = null
    return null
  }
}

async function isSteamClientApiAvailable(): Promise<boolean> {
  return (await getSharedJSContextSocketUrl()) !== null
}

interface EvaluateResponse {
  id: number
  result?: {
    result?: { value?: unknown }
    exceptionDetails?: {
      text?: string
      exception?: { description?: string }
    }
  }
}

async function evalInSteamClient<T>(expression: string): Promise<T> {
  const socketUrl = await getSharedJSContextSocketUrl()
  if (!socketUrl) {
    throw new Error('The Steam client debugging interface is not available')
  }

  return new Promise<T>((resolve, reject) => {
    const socket = new WebSocket(socketUrl)
    let settled = false

    const timeout = setTimeout(() => {
      settled = true
      socket.close()
      reject(new Error('Timed out waiting for the Steam client'))
    }, EVAL_TIMEOUT_MS)

    const finish = (callback: () => void) => {
      settled = true
      clearTimeout(timeout)
      socket.close()
      callback()
    }

    socket.onerror = () => {
      cachedSocketUrl = null
      finish(() => reject(new Error('Connection to the Steam client failed')))
    }

    socket.onclose = () => {
      if (!settled) {
        cachedSocketUrl = null
        finish(() =>
          reject(new Error('The Steam client closed the connection'))
        )
      }
    }

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true }
        })
      )
    }

    socket.onmessage = (event) => {
      let response: EvaluateResponse
      try {
        response = JSON.parse(String(event.data))
      } catch (error) {
        finish(() => reject(new Error(`${error}`)))
        return
      }

      if (response.id !== 1) {
        return
      }

      const exception = response.result?.exceptionDetails
      if (exception) {
        const description =
          exception.exception?.description ??
          exception.text ??
          'SteamClient call failed'
        finish(() => reject(new Error(description)))
      } else {
        finish(() => resolve(response.result?.result?.value as T))
      }
    }
  })
}

async function getSteamClientShortcuts(): Promise<SteamClientShortcut[]> {
  const shortcuts = await evalInSteamClient<SteamClientShortcut[]>(
    `(async () => {
      const apps = appStore.allApps.filter((app) => app.BIsShortcut())
      const shortcuts = []
      for (const app of apps) {
        let details = appDetailsStore.GetAppDetails(app.appid)
        if (!details) {
          appDetailsStore.RequestAppDetails(app.appid)
          for (let i = 0; i < 10 && !details; i++) {
            await new Promise((resolve) => setTimeout(resolve, 100))
            details = appDetailsStore.GetAppDetails(app.appid)
          }
        }
        shortcuts.push({
          appid: app.appid,
          appName: details?.strDisplayName ?? app.display_name ?? '',
          exe: details?.strShortcutExe ?? '',
          launchOptions: details?.strShortcutLaunchOptions ?? ''
        })
      }
      return shortcuts
    })()`
  )
  if (!Array.isArray(shortcuts)) {
    throw new Error('Could not get the shortcut list from the Steam client')
  }
  return shortcuts
}

async function addShortcutViaSteamClient(props: {
  name: string
  exe: string
  startDir: string
  launchOptions: string
  icon?: string
}): Promise<number> {
  const name = JSON.stringify(props.name)
  const exe = JSON.stringify(props.exe)
  const startDir = JSON.stringify(props.startDir)
  const launchOptions = JSON.stringify(props.launchOptions)
  const icon = props.icon ? JSON.stringify(props.icon) : ''

  return evalInSteamClient<number>(
    `(async () => {
      const appId = await SteamClient.Apps.AddShortcut(${name}, ${exe}, '', '')
      if (typeof appId !== 'number' || appId <= 0) {
        throw new Error('AddShortcut did not return an app id')
      }
      SteamClient.Apps.SetShortcutName(appId, ${name})
      SteamClient.Apps.SetShortcutExe(appId, ${exe})
      SteamClient.Apps.SetShortcutStartDir(appId, ${startDir})
      SteamClient.Apps.SetShortcutLaunchOptions(appId, ${launchOptions})
      ${icon ? `SteamClient.Apps.SetShortcutIcon(appId, ${icon})` : ''}
      return appId
    })()`
  )
}

async function removeShortcutViaSteamClient(appId: number): Promise<void> {
  await evalInSteamClient<boolean>(
    `(async () => {
      SteamClient.Apps.RemoveShortcut(${Math.trunc(appId)})
      return true
    })()`
  )
}

const steamClientArtworkTypes = {
  grid: 0,
  hero: 1,
  logo: 2,
  wideGrid: 3
} as const

async function setShortcutArtworkViaSteamClient(props: {
  appId: number
  imagePath: string
  assetType: (typeof steamClientArtworkTypes)[keyof typeof steamClientArtworkTypes]
}): Promise<void> {
  if (!existsSync(props.imagePath)) {
    return
  }

  try {
    const imageData = (await readFile(props.imagePath)).toString('base64')
    const imageExt = extname(props.imagePath).replace('.', '') || 'jpg'
    await evalInSteamClient<boolean>(
      `(async () => {
        await SteamClient.Apps.SetCustomArtworkForApp(
          ${Math.trunc(props.appId)},
          ${JSON.stringify(imageData)},
          ${JSON.stringify(imageExt)},
          ${props.assetType}
        )
        return true
      })()`
    )
  } catch (error) {
    logWarning(
      [`Failed to set Steam artwork from ${props.imagePath} with:`, error],
      LogPrefix.Shortcuts
    )
  }
}

export {
  isSteamClientApiAvailable,
  getSteamClientShortcuts,
  addShortcutViaSteamClient,
  removeShortcutViaSteamClient,
  setShortcutArtworkViaSteamClient,
  steamClientArtworkTypes
}
