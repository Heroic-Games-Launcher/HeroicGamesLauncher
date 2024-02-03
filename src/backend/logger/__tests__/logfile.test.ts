import { DirResult, dirSync } from 'tmp'
import graceful_fs from 'graceful-fs'
import { join } from 'path'
import { app } from 'electron'
import { configStore } from '../../constants'
import * as logfile from '../logfile'
import * as logger from '../logger'
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

  // FIXME: this test for some reason is correct in CI but `app.getPath` returning 'invalid'
  // is not really an invalid path locally, it just creates the path as a subdirectory of
  // the root folder
  //
  // test('createNewLogFileAndClearOldOnes fails because logDir does not exist', () => {
  //   const spyAppGetPath = jest.spyOn(app, 'getPath').mockReturnValue('invalid')
  //   const spyOpenSync = jest.spyOn(graceful_fs, 'openSync')

  //   logfile.createNewLogFileAndClearOldOnes()

  //   const year = `${new Date().getFullYear()}`

  //   expect(spyOpenSync).toBeCalledWith(
  //     expect.stringContaining(`invalid/${year}-`),
  //     'w'
  //   )
  //   expect(spyAppGetPath).toBeCalledWith('logs')
  //   expect(logError).toBeCalledWith(
  //     [
  //       expect.stringContaining(`Open invalid/${year}-`),
  //       expect.objectContaining(
  //         Error(`ENOENT: no such file or directory, open 'invalid/${year}-`)
  //       )
  //     ],
  //     { prefix: 'Backend', skipLogToFile: true }
  //   )
  // })

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

    expect(logger.logError).not.toBeCalled()
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

    expect(logger.logError).toBeCalledWith(
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

    expect(logger.logError).not.toBeCalled()
    expect(graceful_fs.existsSync(monthOutdatedLogFile)).toBeFalsy()
    expect(graceful_fs.existsSync(yearOutdatedLogFile)).toBeFalsy()
  })

  test('getLogFile all possible values', () => {
    expect(logfile.getLogFile('heroic')).toMatch(/-heroic.log$/)
    expect(logfile.getLogFile('legendary')).toMatch(/-legendary.log$/)
    expect(logfile.getLogFile('gogdl')).toMatch(/-gogdl.log$/)
    expect(logfile.getLogFile('nile')).toMatch(/-nile.log$/)
    // get game log
    expect(logfile.getLogFile('MyApp')).toBe(
      '/tmp/appData/heroic/GamesConfig/MyApp-lastPlay.log'
    )
  })

  test('appendMessageToLogFile success', async () => {
    const appendHeroicLogSpy = jest
      .spyOn(logger, 'appendHeroicLog')
      .mockReturnValue()

    logfile.appendMessageToLogFile('Hello World')
    expect(appendHeroicLogSpy).toBeCalledWith('Hello World\n')
  })
})
