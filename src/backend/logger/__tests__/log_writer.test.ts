import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import LogWriter from '../log_writer'

jest.mock('../index', () => ({
  getLogFilePath: jest.fn(() => '/tmp/heroic-general.log'),
  logDebug: jest.fn()
}))

describe('LogWriter', () => {
  let tmpDir: string
  let logFilePath: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'heroic-log-writer-'))
    logFilePath = join(tmpDir, 'launch.log')
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('archives an existing log file to .old on the first write', async () => {
    writeFileSync(logFilePath, 'previous session\n')
    const writer = new LogWriter(logFilePath, false, false)

    await writer.writeString('new session')

    expect(readFileSync(writer.oldLogFilePath, 'utf-8')).toBe(
      'previous session\n'
    )
    expect(readFileSync(logFilePath, 'utf-8')).toBe('new session\n')
  })

  it('collapses consecutive identical lines across writes and chunks', async () => {
    const writer = new LogWriter(logFilePath, false, false)
    const spam = 'fixme:quartz:v4l_device_create Unhandled frame size type: 2.'

    await writer.writeString(spam)
    await writer.writeString(`${spam}\n${spam}\n`)
    await writer.writeString(spam)
    await writer.close()

    expect(readFileSync(logFilePath, 'utf-8')).toBe(
      [
        spam,
        '[Last line repeated 3 times]',
        '============= End of log =============',
        ''
      ].join('\n')
    )
  })

  it('uses singular form when a line is repeated once', async () => {
    const writer = new LogWriter(logFilePath, false, false)

    await writer.writeString('duplicate line')
    await writer.writeString('duplicate line')
    await writer.writeString('next line')

    expect(readFileSync(logFilePath, 'utf-8')).toBe(
      ['duplicate line', '[Last line repeated 1 time]', 'next line', ''].join(
        '\n'
      )
    )
  })

  it('rotates the active log file to .old when exceeding maxFileBytes', async () => {
    const writer = new LogWriter(logFilePath, false, false, 40)

    await writer.writeString('first entry that fits within limit')
    expect(existsSync(writer.oldLogFilePath)).toBe(false)

    await writer.writeString('second entry that triggers rotation')

    expect(readFileSync(writer.oldLogFilePath, 'utf-8')).toBe(
      'first entry that fits within limit\n'
    )
    expect(readFileSync(logFilePath, 'utf-8')).toBe(
      'second entry that triggers rotation\n'
    )
  })
})
