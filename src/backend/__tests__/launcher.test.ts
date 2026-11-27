import { callRunner } from '../launcher'
import { LogPrefix } from '../logger'

jest.mock('../logger', () => ({
  ...jest.requireActual<typeof import('../logger')>('../logger'),
  logInfo: jest.fn(),
  logError: jest.fn(),
  getRunnerLogWriter: () => ({ logInfo: jest.fn(), writeString: jest.fn() })
}))

describe('callRunner', () => {
  it('passes the exit code of the runner through', async () => {
    const runner = { name: 'gog' as const, logPrefix: LogPrefix.Gog, bin: 'sh' }
    expect((await callRunner(['-c', 'exit 3'], runner, {})).exitCode).toBe(3)
    expect((await callRunner(['-c', 'exit 0'], runner, {})).exitCode).toBe(0)
  })
})
