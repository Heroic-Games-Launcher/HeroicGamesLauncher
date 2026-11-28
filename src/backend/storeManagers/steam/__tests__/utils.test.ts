import { AureliaError } from '../aurelia'
import {
  isSteamRunningError,
  pickLaunchTarget,
  reportSteamRunning,
  withoutPlatformFlag
} from '../utils'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'

jest.mock('backend/launcher', () => ({ callRunner: jest.fn() }))
jest.mock('backend/utils', () => ({
  getAureliaBin: jest.fn(() => ({ dir: '', bin: 'aurelia' }))
}))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Steam: 'Steam' }
}))
jest.mock('backend/constants/paths', () => ({ appFolder: '/tmp/heroic' }))
jest.mock('backend/ipc', () => ({ sendFrontendMessage: jest.fn() }))
jest.mock('backend/dialog/dialog', () => ({
  showDialogBoxModalAuto: jest.fn()
}))

// Aurelia v0.2.5 refusal text.
const REFUSAL =
  'Steam is running. Close it first, or re-run with --restart-steam to have ' +
  'Aurelia stop and restart it around the change.'

describe('isSteamRunningError', () => {
  it('matches the refusal as an AureliaError', () => {
    expect(isSteamRunningError(new AureliaError(REFUSAL))).toBe(true)
  })

  it('matches the refusal inside raw output', () => {
    expect(isSteamRunningError(`{"error":"${REFUSAL}"}`)).toBe(true)
  })

  it('ignores other failures', () => {
    expect(isSteamRunningError(new AureliaError('disk full'))).toBe(false)
  })
})

describe('reportSteamRunning', () => {
  beforeEach(() => jest.mocked(showDialogBoxModalAuto).mockClear())

  it('shows a dialog for the refusal', () => {
    reportSteamRunning(new AureliaError(REFUSAL))
    expect(showDialogBoxModalAuto).toHaveBeenCalledTimes(1)
  })

  it('stays quiet for other failures', () => {
    reportSteamRunning(new Error('network down'))
    expect(showDialogBoxModalAuto).not.toHaveBeenCalled()
  })
})

describe('withoutPlatformFlag', () => {
  it('drops the flag and its value', () => {
    expect(
      withoutPlatformFlag(['--platform', 'windows', '--steam-mode', 'host'])
    ).toEqual(['--steam-mode', 'host'])
    expect(withoutPlatformFlag(['--platform', 'linux'])).toEqual([])
  })

  it('leaves other flags alone', () => {
    expect(withoutPlatformFlag(['--steam'])).toEqual(['--steam'])
  })
})

describe('pickLaunchTarget', () => {
  const targets = [
    { id: 'linux', available: true, missing: null },
    { id: 'windows-host', available: false, missing: 'build' },
    { id: 'windows-runtime', available: false, missing: 'steam-runtime' }
  ]

  it('returns an available pick', () => {
    expect(pickLaunchTarget(targets, 'linux', false)?.id).toBe('linux')
  })

  it('keeps a pick whose build is missing only when Aurelia installs it', () => {
    expect(pickLaunchTarget(targets, 'windows-host', false)).toBeUndefined()
    expect(pickLaunchTarget(targets, 'windows-host', true)?.id).toBe(
      'windows-host'
    )
  })

  it('never keeps a pick missing its Steam runtime', () => {
    expect(pickLaunchTarget(targets, 'windows-runtime', true)).toBeUndefined()
  })

  it('returns nothing without a pick', () => {
    expect(pickLaunchTarget(targets, undefined, true)).toBeUndefined()
  })
})
