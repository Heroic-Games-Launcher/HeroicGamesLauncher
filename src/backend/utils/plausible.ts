import { backendEvents } from 'backend/backend_events'
import {
  isFlatpak,
  isAppImage,
  isSnap,
  isSteamDeckGameMode,
  isSteamDeck
} from 'backend/constants/environment'
import { logInfo, logWarning, LogPrefix } from 'backend/logger'
import { GOGUser } from 'backend/storeManagers/gog/user'
import { LegendaryUser } from 'backend/storeManagers/legendary/user'
import { NileUser } from 'backend/storeManagers/nile/user'
import { libraryStore } from 'backend/storeManagers/sideload/electronStores'
import { getOsInfo } from 'backend/utils/systeminfo/osInfo'
import { app } from 'electron'
import https from 'https'

const PLAUSIBLE_DOMAIN = 'heroic-games-client.com'
const PLAUSIBLE_API = 'https://analytics.heroicgameslauncher.com/api/event'

interface PlausibleEventProps {
  [key: string]: string | number | boolean
}

// A browser-like User-Agent lets Plausible parse the OS natively from the
// request instead of us sending it as a custom property.
function getUserAgent(): string {
  const chromeVersion = process.versions.chrome || '120.0.0.0'
  const engine = `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`

  switch (process.platform) {
    case 'win32':
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${engine}`
    case 'darwin':
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${engine}`
    default:
      return `Mozilla/5.0 (X11; Linux x86_64) ${engine}`
  }
}

const USER_AGENT = getUserAgent()

function sendPlausible(payload: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const req = https.request(
      PLAUSIBLE_API,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT
        }
      },
      (res) => {
        res.on('data', () => {})
        res.on('end', resolve)
      }
    )
    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timed out'))
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function Plausible() {
  return {
    enableAutoPageviews() {
      // For desktop apps, send a single "pageview" event on app load
      sendPlausible({
        name: 'pageview',
        url: 'app://main',
        domain: PLAUSIBLE_DOMAIN
      }).catch(() => {})
    },
    trackEvent(eventName: string, opts?: { props?: PlausibleEventProps }) {
      sendPlausible({
        name: eventName,
        url: 'app://main',
        domain: PLAUSIBLE_DOMAIN,
        props: opts?.props
      }).catch(() => {})
    }
  }
}

export async function startPlausible() {
  if (process.env.CI === 'e2e') {
    logInfo('Skipping Plausible Analytics in E2E tests', LogPrefix.Backend)
    return
  }

  const plausible = Plausible()
  plausible.enableAutoPageviews()
  const appVersion = app.getVersion()
  const providersObject = {
    gog: !!GOGUser.isLoggedIn(),
    epic: !!LegendaryUser.isLoggedIn(),
    amazon: !!NileUser.isLoggedIn(),
    sideloaded: libraryStore.raw_store.games?.length > 0
  }
  const loggedInProviders = Object.entries(providersObject)
    .filter(([, v]) => v)
    .map(([k]) => k)

  let distro = 'unknown'
  let distroVersion = 'unknown'
  try {
    const osInfo = await getOsInfo()
    if (osInfo.name) distro = osInfo.name
    if (osInfo.version) distroVersion = osInfo.version
  } catch (error) {
    logWarning(
      `Failed to read OS info for analytics: ${error}`,
      LogPrefix.Backend
    )
  }

  // OS is parsed natively from the User-Agent and Country from the request IP,
  // so only what Plausible can't derive on its own is sent as custom props.
  const props = {
    version: appVersion,
    gog: providersObject.gog || false,
    epic: providersObject.epic || false,
    amazon: providersObject.amazon || false,
    sideloaded: providersObject.sideloaded || false,
    providers: loggedInProviders.join(', '),
    arch: process.arch,
    distro,
    distroVersion,
    isFlatpak: isFlatpak,
    isAppImage: isAppImage,
    isSnap: isSnap,
    isSteamDeckGameMode: isSteamDeckGameMode,
    isSteamDeck: !!isSteamDeck
  }

  logInfo('Starting Plausible Analytics', LogPrefix.Backend)
  logInfo(`Shared Data: ${JSON.stringify(props)}`, LogPrefix.Backend)
  plausible.trackEvent('App Loaded', { props })
}

backendEvents.on('settingChanged', ({ key, newValue }) => {
  if (key === 'analyticsOptIn') {
    if (newValue) {
      logInfo('Starting Plausible Analytics', LogPrefix.Backend)
      startPlausible()
    } else {
      logInfo('Stopping Plausible Analytics', LogPrefix.Backend)
    }
  }
})
