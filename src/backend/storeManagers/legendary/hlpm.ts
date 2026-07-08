import axios from 'axios'
import { randomBytes } from 'crypto'
import * as XMPP from 'stanza'

const accountApi = 'https://account-public-service-prod.ol.epicgames.com'
const epicProdEnv = 'prod.ol.epicgames.com'
const fortniteClientId = 'ec684b8c687f479fadea3cb2ad83f5c6'
const fortniteClientSecret = 'e1f31c211f28413186262d37a13fc84d'
const xmppConnectionTimeout = 15_000
const xmppServer = 'xmpp-service-prod.ol.epicgames.com'

interface FortniteAuthSession {
  access_token: string
  account_id: string
}

type XMPPConfigWithCredentials = XMPP.AgentConfig & {
  credentials: {
    host: string
    username: string
    password: string
  }
}

async function getExchangeCode(accessToken: string): Promise<string> {
  const { data } = await axios.get<{ code: string }>(
    `${accountApi}/account/api/oauth/exchange`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return data.code
}

async function createFortniteSession(
  exchangeCode: string
): Promise<FortniteAuthSession> {
  const { data } = await axios.post<FortniteAuthSession>(
    `${accountApi}/account/api/oauth/token`,
    new URLSearchParams({
      grant_type: 'exchange_code',
      exchange_code: exchangeCode,
      token_type: 'eg1'
    }).toString(),
    {
      headers: {
        Authorization: `basic ${Buffer.from(`${fortniteClientId}:${fortniteClientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  )
  return data
}

async function revokeFortniteSession(accessToken: string) {
  await axios.delete(
    `${accountApi}/account/api/oauth/sessions/kill/${accessToken}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )
}

export class HLPM {
  private fortniteAccessToken: string | undefined
  private xmpp: XMPP.Agent | undefined
  private stopRequested = false

  constructor(
    private readonly legendaryAccessToken: string,
    private readonly onPresenceMessage: (message: string) => void
  ) {}

  async connect() {
    this.stopRequested = false
    try {
      const exchangeCode = await getExchangeCode(this.legendaryAccessToken)
      const session = await createFortniteSession(exchangeCode)

      if (this.stopRequested) {
        await revokeFortniteSession(session.access_token).catch(() => undefined)
        return
      }

      this.fortniteAccessToken = session.access_token
      this.xmpp = this.createXmppClient(session)
      await this.connectXmpp(this.xmpp)

      if (this.stopRequested) await this.disconnect()
    } catch (error) {
      await this.disconnect()
      throw error
    }
  }

  isConnected() {
    return Boolean(this.xmpp?.sessionStarted)
  }

  async disconnect() {
    this.stopRequested = true

    const xmpp = this.xmpp
    this.xmpp = undefined
    if (xmpp) {
      xmpp.removeAllListeners()
      xmpp.disconnect()
    }

    const token = this.fortniteAccessToken
    this.fortniteAccessToken = undefined
    if (token) await revokeFortniteSession(token).catch(() => undefined)
  }

  private createXmppClient(session: FortniteAuthSession) {
    const config: XMPPConfigWithCredentials = {
      allowResumption: false,
      autoReconnect: false,
      jid: `${session.account_id}@${epicProdEnv}`,
      server: epicProdEnv,
      transportPreferenceOrder: ['websocket'],
      transports: {
        websocket: `wss://${xmppServer}`,
        bosh: false
      },
      credentials: {
        host: epicProdEnv,
        username: session.account_id,
        password: session.access_token
      },
      resource: `V2:Fortnite:WIN::${randomBytes(16).toString('hex').toUpperCase()}`
    }

    const xmpp = XMPP.createClient(config)
    xmpp.on('raw:incoming', (message) => {
      if (message.startsWith('<presence')) this.onPresenceMessage(message)
    })

    return xmpp
  }

  private connectXmpp(xmpp: XMPP.Agent) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Epic XMPP connection timed out'))
      }, xmppConnectionTimeout)

      const cleanup = () => {
        clearTimeout(timeout)
        xmpp.off('session:started', onStarted)
        xmpp.off('stream:error', onError)
        xmpp.off('disconnected', onDisconnected)
      }
      const onStarted = () => {
        cleanup()
        xmpp.sendPresence()
        resolve()
      }
      const onError = (error: unknown) => {
        cleanup()
        reject(error instanceof Error ? error : new Error(String(error)))
      }
      const onDisconnected = () => {
        cleanup()
        reject(new Error('Epic XMPP disconnected before session started'))
      }

      xmpp.once('session:started', onStarted)
      xmpp.once('stream:error', onError)
      xmpp.once('disconnected', onDisconnected)
      xmpp.connect()
    })
  }
}
