import { DirResult, dirSync } from 'tmp'
import graceful_fs from 'graceful-fs'
import { join } from 'path'
import { app } from 'electron'
import { configStore } from '../../constants'
import * as logfile from '../logfile'
import { logError } from '../logger'
import { describeSkipOnWindows } from 'backend/__tests__/skip'

jest.mock('electron')
jest.mock('electron-store')
jest.mock('../../constants')
jest.mock('../logger')
jest.unmock('../logfile')

let tmpDir = {} as DirResult

describeSkipOnWindows('logger/logfile.ts', () => {
  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
  })

  afterEach(() => {
    jest.restoreAllMocks()
    tmpDir.removeCallback()
  })

  test('createNewLogFileAndClearOldOnes fails because logDir does not exist', () => {
    const spyAppGetPath = jest.spyOn(app, 'getPath').mockReturnValue('invalid')
    const spyOpenSync = jest.spyOn(graceful_fs, 'openSync')

    logfile.createNewLogFileAndClearOldOnes()

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

  test('createNewLogFileAndClearOldOnes success', () => {
    jest.spyOn(app, 'getPath').mockReturnValue(tmpDir.name)
    configStore.set('general-logs', {
      currentLogFile: 'old/log/path/file.log',
      lastLogFile: '',
      legendaryLogFile: '',
      gogdlLogFile: '',
      nileLogFile: ''
    })

    const data = logfile.createNewLogFileAndClearOldOnes()

    expect(logError).not.toBeCalled()
    expect(data).toStrictEqual({
      currentLogFile: expect.any(String),
      lastLogFile: 'old/log/path/file.log',
      legendaryLogFile: expect.any(String),
      gogdlLogFile: expect.any(String),
      nileLogFile: expect.any(String)
    })
  })

  test('createNewLogFileAndClearOldOnes removing old logs fails', () => {
    jest.spyOn(app, 'getPath').mockReturnValue(tmpDir.name)
    jest.spyOn(graceful_fs, 'unlinkSync').mockImplementation(() => {
      throw Error('unlink failed')
    })
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    const monthOutdatedLogFile = join(
      tmpDir.name,
      `heroic-${date.toISOString().replaceAll(':', '_')}.log`
    )

    graceful_fs.closeSync(graceful_fs.openSync(monthOutdatedLogFile, 'w'))

    expect(graceful_fs.existsSync(monthOutdatedLogFile)).toBeTruthy()

    logfile.createNewLogFileAndClearOldOnes()

    expect(logError).toBeCalledWith(
      [
        expect.stringContaining('Removing old logs in /tmp/'),
        Error('unlink failed')
      ],
      { prefix: 'Backend', skipLogToFile: true }
    )
    expect(graceful_fs.existsSync(monthOutdatedLogFile)).toBeTruthy()
  })

  test('createNewLogFileAndClearOldOnes removing old logs successful', () => {
    jest.spyOn(app, 'getPath').mockReturnValue(tmpDir.name)
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    const monthOutdatedLogFile = join(
      tmpDir.name,
      `heroic-${date.toISOString().replaceAll(':', '_')}.log`
    )
    date.setFullYear(2021)
    const yearOutdatedLogFile = join(
      tmpDir.name,
      `heroic-${date.toISOString().replaceAll(':', '_')}.log`
    )

    graceful_fs.closeSync(graceful_fs.openSync(monthOutdatedLogFile, 'w'))
    graceful_fs.closeSync(graceful_fs.openSync(yearOutdatedLogFile, 'w'))

    expect(graceful_fs.existsSync(monthOutdatedLogFile)).toBeTruthy()
    expect(graceful_fs.existsSync(yearOutdatedLogFile)).toBeTruthy()

    logfile.createNewLogFileAndClearOldOnes()

    expect(logError).not.toBeCalled()
    expect(graceful_fs.existsSync(monthOutdatedLogFile)).toBeFalsy()
    expect(graceful_fs.existsSync(yearOutdatedLogFile)).toBeFalsy()
  })

  test('getLogFile all possible values', () => {
    // get global current logfile
    expect(logfile.getLogFile({})).toBe('current.log')
    // get global last logfile
    expect(logfile.getLogFile({ defaultLast: true })).toBe('last.log')

    // get game log
    expect(logfile.getLogFile({ appName: 'MyApp' })).toBe(
      '/tmp/appData/heroic/GamesConfig/MyApp-lastPlay.log'
    )
    // get game log and isDefaultLast has no impact
    expect(logfile.getLogFile({ appName: 'MyApp', defaultLast: true })).toBe(
      '/tmp/appData/heroic/GamesConfig/MyApp-lastPlay.log'
    )
  })

  test('appendMessageToLogFile success', () => {
    const appendFileSyncSpy = jest
      .spyOn(graceful_fs, 'appendFileSync')
      .mockReturnValue()

    logfile.appendMessageToLogFile('Hello World')
    expect(appendFileSyncSpy).toBeCalledWith('current.log', 'Hello World\n')
  })

  test('appendMessageToLogFile logfile undefined', () => {
    const appendFileSyncSpy = jest
      .spyOn(graceful_fs, 'appendFileSync')
      .mockReturnValue()

    const mockConstants = jest.requireMock('../../constants')
    const defaultCurrentLogName = mockConstants.currentLogFile
    mockConstants.currentLogFile = ''

    logfile.appendMessageToLogFile('Hello World')

    mockConstants.currentLogFile = defaultCurrentLogName

    expect(appendFileSyncSpy).not.toBeCalled()
  })

  test('appendMessageToLogFile fails', () => {
    jest.spyOn(graceful_fs, 'appendFileSync').mockImplementation(() => {
      throw Error('append failed')
    })

    logfile.appendMessageToLogFile('Hello World')
    expect(logError).toBeCalledWith(
      ['Writing log file failed with', Error('append failed')],
      { prefix: 'Backend', skipLogToFile: true }
    )
  })
})
