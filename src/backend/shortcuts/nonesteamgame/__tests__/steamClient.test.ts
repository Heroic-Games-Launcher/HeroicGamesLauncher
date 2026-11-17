import axios from 'axios'
import {
  addShortcutViaSteamClient,
  getSteamClientShortcuts,
  isSteamClientApiAvailable,
  removeShortcutViaSteamClient
} from '../steamClient'

jest.mock('axios')
jest.mock('backend/logger', () => ({
  logDebug: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Shortcuts: 'Shortcuts' }
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

const sentMessages: string[] = []
let evalValue: unknown = true
let evalException: string | undefined

class MockWebSocket {
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  constructor() {
    void Promise.resolve().then(() => this.onopen?.())
  }

  send(data: string) {
    const message = JSON.parse(data) as { id: number }
    sentMessages.push(data)
    void Promise.resolve().then(() => {
      if (!this.onmessage) {
        return
      }
      const result: Record<string, unknown> = {}
      if (evalException) {
        result.exceptionDetails = { text: evalException }
      } else {
        result.result = { value: evalValue }
      }
      this.onmessage({ data: JSON.stringify({ id: message.id, result }) })
    })
  }

  close() {}
}

function lastExpression(): string {
  const message = JSON.parse(sentMessages.at(-1)!) as {
    params: { expression: string }
  }
  return message.params.expression
}

describe('steamClient', () => {
  beforeEach(() => {
    sentMessages.length = 0
    evalValue = true
    evalException = undefined
    ;(globalThis as unknown as { WebSocket: unknown }).WebSocket = MockWebSocket
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          title: 'SharedJSContext',
          webSocketDebuggerUrl: 'ws://127.0.0.1:8080/devtools/page/test'
        }
      ]
    })
  })

  test('awaits every SteamClient.Apps.SetShortcut* call before resolving', async () => {
    evalValue = 1234

    await addShortcutViaSteamClient({
      name: 'My Game',
      exe: '/opt/heroic/heroic',
      startDir: '/opt/heroic',
      launchOptions: '--no-gui heroic://launch?appName=Game&runner=sideload'
    })

    const expression = lastExpression()
    expect(expression).toMatch(/await\s+SteamClient\.Apps\.SetShortcutName\(/)
    expect(expression).toMatch(/await\s+SteamClient\.Apps\.SetShortcutExe\(/)
    expect(expression).toMatch(
      /await\s+SteamClient\.Apps\.SetShortcutStartDir\(/
    )
    expect(expression).toMatch(
      /await\s+SteamClient\.Apps\.SetShortcutLaunchOptions\(/
    )
  })

  test('strips surrounding double quotes from exe and startDir before passing values to the API', async () => {
    evalValue = 42

    await addShortcutViaSteamClient({
      name: 'My Game',
      exe: '"/opt/heroic/heroic"',
      startDir: '"/opt/heroic"',
      launchOptions: '--no-gui heroic://launch?appName=Game&runner=sideload'
    })

    const expression = lastExpression()
    expect(expression).toContain('"/opt/heroic/heroic"')
    expect(expression).toContain('"/opt/heroic"')
    expect(expression).not.toContain('\\"')
  })

  test('isSteamClientApiAvailable probes SteamClient.Apps instead of trusting the socket alone', async () => {
    evalValue = false

    await expect(isSteamClientApiAvailable()).resolves.toBe(false)
    expect(sentMessages).not.toHaveLength(0)
    expect(lastExpression()).toContain('SteamClient.Apps')
  })

  test('isSteamClientApiAvailable returns false when the probe throws', async () => {
    evalException = 'SteamClient is not defined'

    await expect(isSteamClientApiAvailable()).resolves.toBe(false)
  })

  test('awaits RemoveShortcut before resolving', async () => {
    evalValue = true

    await removeShortcutViaSteamClient(1234)

    expect(lastExpression()).toMatch(
      /await\s+SteamClient\.Apps\.RemoveShortcut\(/
    )
  })

  test('getSteamClientShortcuts collects startDir and shortcutPath', async () => {
    evalValue = []

    await getSteamClientShortcuts()

    const expression = lastExpression()
    expect(expression).toMatch(/startDir\s*:/)
    expect(expression).toMatch(/shortcutPath\s*:/)
  })
})
