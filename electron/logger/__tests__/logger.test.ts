import { dirSync } from 'tmp'
import * as logger from '../logger'
import { appendMessageToLogFile } from '../logfile'
import graceful_fs from 'graceful-fs'

jest.mock('../logfile')

describe('Logger', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('log a error message invokes console.error', () => {
    const testData = [
      1234,
      'normalString',
      ['string1', 'string2'],
      { key1: 100, key2: 'value', key3: { subKey: ['hello', 'world'] } },
      new Error('FAILED')
    ]

    const spyConsoleError = jest
      .spyOn(global.console, 'error')
      .mockImplementation()

    logger.logError(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true
    })

    expect(spyConsoleError).toBeCalledWith(
      expect.stringContaining(`ERROR:   [${logger.LogPrefix.Backend}]`),
      ...testData
    )
  })

  test('log a error message appends to log file', () => {
    const testData = [
      1234,
      'normalString',
      ['string1', 'string2'],
      { key1: 100, key2: 'value', key3: { subKey: ['hello', 'world'] } },
      new Error('FAILED')
    ]

    logger.logError(testData, {
      prefix: logger.LogPrefix.Backend
    })

    expect(appendMessageToLogFile).toBeCalledWith(
      expect.stringContaining(
        [
          `ERROR:   [${logger.LogPrefix.Backend}]:  1234 normalString string1,string2 {`,
          '  "key1": 100,',
          '  "key2": "value",',
          '  "key3": {',
          '    "subKey": [',
          '      "hello",',
          '      "world"',
          '    ]',
          '  }',
          '} Error: FAILED'
        ].join('\n')
      )
    )
  })

  // test('log a warning message invokes console.log', () => {
  //   console.warn = jest.fn()
  //   logger.logWarning('My warning message')
  //   expect(console.warn).toBeCalledWith(
  //     expect.stringContaining('WARNING: My warning message')
  //   )

  //   // log with prefix
  //   logger.logWarning('My warning message', logger.{ prefix: LogPrefix.Legendary })
  //   expect(console.warn).toBeCalledWith(
  //     expect.stringContaining(
  //       `WARNING: [${logger.{ prefix: LogPrefix.Legendary }}]: My warning message`
  //     )
  //   )
  // })

  // test('log a info message invokes console.log', () => {
  //   console.log = jest.fn()
  //   logger.logInfo('My info message')
  //   expect(console.log).toBeCalledWith(
  //     expect.stringContaining('INFO:    My info message')
  //   )

  //   // log with prefix
  //   logger.logInfo('My info message', logger.{ prefix: LogPrefix.Frontend })
  //   expect(console.log).toBeCalledWith(
  //     expect.stringContaining(
  //       `INFO:    [${logger.{ prefix: LogPrefix.Frontend }}]: My info message`
  //     )
  //   )
  // })

  // test('log a debug message invokes console.log', () => {
  //   console.log = jest.fn()
  //   logger.logDebug('My debug message')
  //   expect(console.log).toBeCalledWith(
  //     expect.stringContaining('DEBUG:   My debug message')
  //   )

  //   // log with prefix
  //   logger.logDebug('My debug message', logger.{ prefix: LogPrefix.Legendary })
  //   expect(console.log).toBeCalledWith(
  //     expect.stringContaining(
  //       `DEBUG:   [${logger.{ prefix: LogPrefix.Legendary }}]: My debug message`
  //     )
  //   )
  // })
})
