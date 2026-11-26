import { callRunner } from '../launcher'
import { parseAureliaJson } from '../storeManagers/steam/aurelia'

jest.mock('electron-store')
jest.mock('backend/logger', () => ({
  getRunnerLogWriter: () => ({ logInfo: jest.fn(), writeString: jest.fn() }),
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Steam: 'Steam', Backend: 'Backend' }
}))

// Prints a pretty-printed library like `aurelia list --json`
const PRINT_GAMES = `
const games = Array.from({ length: 10000 }, (_, i) => ({
  app_id: i + 1,
  name: 'Game ' + i + ' ',
  store_url: 'https://store.steampowered.com/app/' + (i + 1),
  assets: { header: 'h'.repeat(300), capsule: 'c'.repeat(300) }
}))
process.stdout.write(JSON.stringify(games, null, 2))
`

const node = { name: 'steam', logPrefix: 'Steam', bin: process.execPath }

describe('callRunner', () => {
  it('keeps a large JSON result complete with fullOutput', async () => {
    const res = await callRunner(['-e', PRINT_GAMES], node as never, {
      fullOutput: true,
      waitForChildProcesses: false
    })
    expect(res.stdout.length).toBeGreaterThan(5 * 1024 * 1024)
    const games = parseAureliaJson<{ app_id: number; name: string }[]>(res)
    expect(games).toHaveLength(10000)
    expect(games[0]).toMatchObject({ app_id: 1, name: 'Game 0 ' })
    expect(games[9999].app_id).toBe(10000)
  })

  it('still caps output without fullOutput', async () => {
    const res = await callRunner(['-e', PRINT_GAMES, '--'], node as never, {
      waitForChildProcesses: false
    })
    expect(res.stdout.length).toBeLessThan(5 * 1024 * 1024)
  })
})
