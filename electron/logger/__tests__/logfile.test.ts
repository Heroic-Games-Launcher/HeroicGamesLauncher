import { DirResult, dirSync } from 'tmp'
import graceful_fs from 'graceful-fs'
import { join } from 'path'
import { app } from 'electron'
import { configStore } from '../../constants'
import * as logfile from '../logfile'
import { logError } from '../logger'

jest.mock('electron')
jest.mock('electron-store')
jest.mock('../../constants')
jest.mock('../logger')
jest.unmock('../logfile')

let tmpDir = {} as DirResult

describe('logger/logfile.ts', () => {
  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    tmpDir.removeCallback()
  })

  test('createNewLogFileAndClearOldOnces fails because logDir does not exist', () => {
    const spyAppGetPath = jest.spyOn(app, 'getPath').mockReturnValue('invalid')
    const spyOpenSync = jest.spyOn(graceful_fs, 'openSync')

    logfile.createNewLogFileAndClearOldOnces()

    expect(spyOpenSync).toBeCalledWith(
      expect.stringContaining('invalid/heroic-'),
      'w'
    )
    expect(spyAppGetPath).toBeCalledWith('logs')
    expect(logError).toBeCalledWith(
      [
        expect.stringContaining(`Open invalid/heroic-`),
        expect.objectContaining(
          Error("ENOENT: no such file or directory, open 'invalid/heroic-")
        )
      ],
      { prefix: 'Backend', skipLogToFile: true }
    )
  })

  test('createNewLogFileAndClearOldOnces success', () => {
    jest.spyOn(app, 'getPath').mockReturnValue(tmpDir.name)
    jest.spyOn(configStore, 'has').mockReturnValue(true)
    jest.spyOn(configStore, 'get').mockReturnValue({
      currentLogFile: 'old/log/path/file.log',
      lastLogFile: undefined
    })

    const data = logfile.createNewLogFileAndClearOldOnces()

    expect(logError).not.toBeCalled()
    expect(data).toStrictEqual({
      currentLogFile: expect.any(String),
      lastLogFile: 'old/log/path/file.log'
    })
  })

  test('createNewLogFileAndClearOldOnces removing old logs fails', () => {
    jest.spyOn(app, 'getPath').mockReturnValue(tmpDir.name)
    const spyUnlinkSync = jest
      .spyOn(graceful_fs, 'unlinkSync')
      .mockImplementation(() => {
        throw Error('unlink failed')
      })
    const date = new Date()
    date.setMonth(date.getMonth() > 0 ? date.getMonth() - 1 : 11)
    const monthOutdated = join(
      tmpDir.name,
      `heroic-${date.toISOString().replaceAll(':', '_')}.log`
    )

    graceful_fs.openSync(monthOutdated, 'w')

    expect(graceful_fs.existsSync(monthOutdated)).toBeTruthy()

    const data = logfile.createNewLogFileAndClearOldOnces()

    expect(logError).toBeCalledWith(
      [
        expect.stringContaining('Removing old logs in /tmp/'),
        Error('unlink failed')
      ],
      { prefix: 'Backend', skipLogToFile: true }
    )
    expect(graceful_fs.existsSync(monthOutdated)).toBeTruthy()
  })

  test('createNewLogFileAndClearOldOnces removing old logs successful', () => {
    jest.spyOn(app, 'getPath').mockReturnValue(tmpDir.name)
    const date = new Date()
    date.setMonth(date.getMonth() > 0 ? date.getMonth() - 1 : 11)
    const monthOutdated = join(
      tmpDir.name,
      `heroic-${date.toISOString().replaceAll(':', '_')}.log`
    )
    date.setFullYear(2021)
    const yearOutdated = join(
      tmpDir.name,
      `heroic-${date.toISOString().replaceAll(':', '_')}.log`
    )

    graceful_fs.openSync(monthOutdated, 'w')
    graceful_fs.openSync(yearOutdated, 'w')

    expect(graceful_fs.existsSync(monthOutdated)).toBeTruthy()
    expect(graceful_fs.existsSync(yearOutdated)).toBeTruthy()

    const data = logfile.createNewLogFileAndClearOldOnces()

    expect(logError).not.toBeCalled()
    expect(graceful_fs.existsSync(monthOutdated)).toBeFalsy()
    expect(graceful_fs.existsSync(yearOutdated)).toBeFalsy()
  })
})
