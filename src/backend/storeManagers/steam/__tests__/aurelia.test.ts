import { AureliaError, parseAureliaJson } from '../aurelia'
import type { ExecResult } from 'common/types'

jest.mock('backend/launcher', () => ({ callRunner: jest.fn() }))
jest.mock('backend/utils', () => ({
  getAureliaBin: jest.fn(() => ({ dir: '', bin: 'aurelia' })),
  getFileSize: jest.fn(),
  formatTime: jest.fn(),
  sendProgressUpdate: jest.fn()
}))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Steam: 'Steam' }
}))
jest.mock('backend/constants/paths', () => ({ appFolder: '/tmp/heroic' }))

function exec(stdout: string, stderr = ''): ExecResult {
  return { stdout, stderr }
}

function parseError(res: ExecResult): AureliaError {
  try {
    parseAureliaJson(res)
  } catch (error) {
    if (error instanceof AureliaError) return error
    throw error
  }
  throw new Error('expected an AureliaError')
}

// Lines captured from aurelia v0.1.41.
describe('parseAureliaJson', () => {
  it('keeps the type and hint of a failed QR result', () => {
    const error = parseError(
      exec(
        '{"error":"QR login failed: QR sign-in was declined or cancelled by Steam","event":"result","hint":"the sign-in was declined; run `aurelia login` again","ok":false,"schema":1,"type":"login_denied"}'
      )
    )
    expect(error.kind).toBe('login_denied')
    expect(error.hint).toContain('declined')
    expect(error.aborted).toBe(false)
  })

  it('types a paused install as cancelled', () => {
    const error = parseError(
      exec(
        '{"error":"install of app 1145360 paused; continue with `aurelia install resume 1145360`","type":"cancelled"}'
      )
    )
    expect(error.kind).toBe('cancelled')
  })

  it('types a full disk', () => {
    const error = parseError(
      exec(
        '{"error":"not enough space on /games: needs 13 GiB but only 2 GiB free","hint":"free space on the target drive or pick another `--library`","type":"disk_full"}'
      )
    )
    expect(error.kind).toBe('disk_full')
    expect(error.hint).toContain('free space')
  })

  it('returns the approved QR result line, the last value', () => {
    const result = parseAureliaJson<{ event?: string; ok?: boolean }>(
      exec(
        '{"account":"me","logged_in":true},{"account":"me","event":"result","ok":true,"schema":1,"steam_id":1,"type":"approved"}'
      )
    )
    expect(result).toMatchObject({ event: 'result', ok: true })
  })

  it('leaves untyped errors without a kind', () => {
    const error = parseError(exec('{"error":"something odd"}'))
    expect(error.kind).toBeUndefined()
    expect(error.hint).toBeUndefined()
  })

  it('reports an aborted command', () => {
    const error = parseError({ stdout: '', stderr: '', abort: true })
    expect(error.aborted).toBe(true)
  })
})
