import https from 'https'

const PLAUSIBLE_DOMAIN = 'heroic-games-client.com'
const PLAUSIBLE_API = 'https://plausible.io/api/event'

export interface PlausibleEventProps {
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

export function Plausible() {
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
