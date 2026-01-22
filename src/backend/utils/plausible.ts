import { backendEvents } from 'backend/backend_events'
import {
  isFlatpak,
  isAppImage,
  isSnap,
  isSteamDeckGameMode,
  isSteamDeck
} from 'backend/constants/environment'
import { logInfo, LogPrefix } from 'backend/logger'
import { GOGUser } from 'backend/storeManagers/gog/user'
import { LegendaryUser } from 'backend/storeManagers/legendary/user'
import { NileUser } from 'backend/storeManagers/nile/user'
import { libraryStore } from 'backend/storeManagers/sideload/electronStores'
import { app } from 'electron'
import https from 'https'

const PLAUSIBLE_DOMAIN = 'heroic-games-client.com'
const PLAUSIBLE_API = 'https://plausible.io/api/event'

interface PlausibleEventProps {
  [key: string]: string | number | boolean
}

function sendPlausible(payload: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const req = https.request(
      PLAUSIBLE_API,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HeroicGamesLauncher/1.0'
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

export function startPlausible() {
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

  const props = {
    version: appVersion,
    gog: providersObject.gog || false,
    epic: providersObject.epic || false,
    amazon: providersObject.amazon || false,
    sideloaded: providersObject.sideloaded || false,
    providers: loggedInProviders.join(', '),
    OS: process.platform,
    isFlatpak: isFlatpak,
    isAppImage: isAppImage,
    isSnap: isSnap,
    isSteamDeckGameMode: isSteamDeckGameMode,
    isSteamDeck: !!isSteamDeck
  }

  if (process.platform) {
    logInfo('Starting Plausible Analytics', LogPrefix.Backend)
    logInfo(`Shared Data: ${JSON.stringify(props)}`, LogPrefix.Backend)
    plausible.trackEvent('App Loaded', {
      props
    })
  }
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
