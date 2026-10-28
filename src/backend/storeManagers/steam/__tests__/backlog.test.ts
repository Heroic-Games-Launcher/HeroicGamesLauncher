import {
  forgetSteamInstall,
  getSteamBacklog,
  getSteamBacklogEntry,
  pruneSteamBacklog
} from '../backlog'
import { AureliaError, runAurelia } from '../aurelia'

jest.mock('../aurelia', () => {
  class AureliaError extends Error {
    constructor(
      message: string,
      readonly aborted = false,
      readonly kind?: string,
      readonly hint?: string
    ) {
      super(message)
    }
  }
  return { AureliaError, runAurelia: jest.fn() }
})
jest.mock('../utils', () => ({
  // Plain function: the config resets mocks.
  isSteamImportEnabled: () => true,
  describeError: (e: unknown) => (e instanceof Error ? e.message : String(e))
}))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Steam: 'Steam' }
}))

const run = runAurelia as jest.MockedFunction<typeof runAurelia>

// `install list --json` from v0.1.41.
const LIST = [
  { app_id: 10, name: 'Running', state: 'running' },
  { app_id: 1145360, name: 'Hades', state: 'paused', library: '/lib' },
  { app_id: 20, name: 'Stopped', state: 'aborted' },
  { app_id: 30, name: 'Crashed', state: 'interrupted' }
]

beforeEach(() => {
  run.mockReset()
  jest.useRealTimers()
})

describe('getSteamBacklog', () => {
  it('keeps only backlog states', async () => {
    run.mockResolvedValueOnce(LIST)
    const ids = (await getSteamBacklog()).map((e) => e.app_id)
    expect(ids).toEqual([1145360, 20, 30])
    expect(run).toHaveBeenCalledWith(['install', 'list'])
  })

  it('treats an older list without state as empty', async () => {
    run.mockResolvedValueOnce([{ app_id: 10, name: 'x' }])
    expect(await getSteamBacklog()).toEqual([])
  })

  it('finds one entry by app id', async () => {
    run.mockResolvedValueOnce(LIST)
    expect(await getSteamBacklogEntry('1145360')).toMatchObject({
      state: 'paused',
      library: '/lib'
    })
  })
})

describe('forgetSteamInstall', () => {
  it('passes --delete-files as -d', async () => {
    run.mockResolvedValueOnce({ status: 'forgotten' })
    await forgetSteamInstall('20', true)
    expect(run).toHaveBeenCalledWith(['install', 'forget', '20', '-d'])
  })

  it('ignores an app that is not in the backlog', async () => {
    run.mockRejectedValueOnce(new AureliaError('gone', false, 'not_found'))
    await forgetSteamInstall('99')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('retries while the install is still stopping', async () => {
    jest.useFakeTimers()
    run
      .mockRejectedValueOnce(
        new AureliaError('app 20 is downloading; stop it first')
      )
      .mockResolvedValueOnce({ status: 'forgotten' })
    const done = forgetSteamInstall('20')
    await jest.advanceTimersByTimeAsync(600)
    await done
    expect(run).toHaveBeenCalledTimes(2)
  })
})

describe('pruneSteamBacklog', () => {
  it('forgets only entries Heroic no longer queues', async () => {
    run.mockResolvedValueOnce(LIST).mockResolvedValue({ status: 'forgotten' })
    await pruneSteamBacklog(new Set(['1145360']))
    const forgotten = run.mock.calls
      .filter(([args]) => args[1] === 'forget')
      .map(([args]) => args[2])
    expect(forgotten).toEqual(['20', '30'])
  })
})
