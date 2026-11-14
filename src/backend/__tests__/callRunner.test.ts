import { callRunner } from '../launcher'
import { getRunnerLogWriter, LogPrefix } from 'backend/logger'
import type LogWriter from 'backend/logger/log_writer'

jest.mock('backend/logger')

// Uses the Node binary running the tests as a stand-in runner, so a real
// process is spawned
const runner = {
  name: 'gog' as const,
  logPrefix: LogPrefix.Gog,
  bin: process.execPath
}

describe('callRunner', () => {
  beforeEach(() => {
    jest.mocked(getRunnerLogWriter).mockReturnValue({
      logInfo: jest.fn(),
      writeString: jest.fn()
    } as unknown as LogWriter)
  })

  it('reports the exit code of a runner that fails', async () => {
    const res = await callRunner(['-e', 'process.exit(3)'], runner, {})

    expect(res.exitCode).toBe(3)
    expect(res.error).toBeUndefined()
  })

  it('reports exit code 0 for a runner that succeeds', async () => {
    const res = await callRunner(['-e', 'console.log(42)'], runner, {})

    expect(res.exitCode).toBe(0)
    expect(res.stdout).toContain('42')
  })
})
