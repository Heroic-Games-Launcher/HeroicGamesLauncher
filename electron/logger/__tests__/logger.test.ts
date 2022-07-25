import * as logger from '../logger'
import { appendMessageToLogFile } from '../logfile'
import { showErrorBoxModalAuto } from '../../utils'

jest.mock('../logfile')
jest.mock('../../utils')

const testData = [
  1234,
  'normalString',
  ['string1', 'string2'],
  { key1: 100, key2: 'value', key3: { subKey: ['hello', 'world'] } },
  new Error('FAILED')
]

function getStringPassedToLogFile(
  type: 'WARNING' | 'ERROR' | 'INFO' | 'DEBUG',
  skipMessagePrefix = false
) {
  let messagePrefix = '1234 normalString string1,string2 {'
  if (!skipMessagePrefix) {
    messagePrefix = `${type}:${' '.repeat(7 - type.length)} [${
      logger.LogPrefix.Backend
    }]:  1234 normalString string1,string2 {`
  }

  return [
    messagePrefix,
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
}

describe('logger/logger.ts', () => {
  afterEach(jest.restoreAllMocks)

  test('log a error message invokes console.error', () => {
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
    jest.spyOn(global.console, 'error').mockImplementation()

    logger.logError(testData, {
      prefix: logger.LogPrefix.Backend
    })

    expect(appendMessageToLogFile).toBeCalledWith(
      expect.stringContaining(getStringPassedToLogFile('ERROR'))
    )
  })

  test('log a error message can be shown as dialog', () => {
    jest.spyOn(global.console, 'error').mockImplementation()

    logger.logError(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true,
      showDialog: true
    })

    expect(showErrorBoxModalAuto).toBeCalledWith(
      'Backend',
      getStringPassedToLogFile('ERROR', true)
    )
  })

  test('log a warning message invokes console.warn', () => {
    const spyConsoleWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation()

    logger.logWarning(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true
    })

    expect(spyConsoleWarn).toBeCalledWith(
      expect.stringContaining(`WARNING: [${logger.LogPrefix.Backend}]`),
      ...testData
    )
  })

  test('log a warning message appends to log file', () => {
    jest.spyOn(global.console, 'warn').mockImplementation()

    logger.logWarning(testData, {
      prefix: logger.LogPrefix.Backend
    })

    expect(appendMessageToLogFile).toBeCalledWith(
      expect.stringContaining(getStringPassedToLogFile('WARNING'))
    )
  })

  test('log a warn message can be shown as dialog', () => {
    jest.spyOn(global.console, 'warn').mockImplementation()

    logger.logWarning(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true,
      showDialog: true
    })

    expect(showErrorBoxModalAuto).toBeCalledWith(
      'Backend',
      getStringPassedToLogFile('WARNING', true)
    )
  })

  test('log a info message invokes console.log', () => {
    const spyConsoleLog = jest.spyOn(global.console, 'log').mockImplementation()

    logger.logInfo(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true
    })

    expect(spyConsoleLog).toBeCalledWith(
      expect.stringContaining(`INFO:    [${logger.LogPrefix.Backend}]`),
      ...testData
    )
  })

  test('log a info message appends to log file', () => {
    jest.spyOn(global.console, 'log').mockImplementation()

    logger.logInfo(testData, {
      prefix: logger.LogPrefix.Backend
    })

    expect(appendMessageToLogFile).toBeCalledWith(
      expect.stringContaining(getStringPassedToLogFile('INFO'))
    )
  })

  test('log a info message can be shown as dialog', () => {
    jest.spyOn(global.console, 'log').mockImplementation()

    logger.logInfo(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true,
      showDialog: true
    })

    expect(showErrorBoxModalAuto).toBeCalledWith(
      'Backend',
      getStringPassedToLogFile('INFO', true)
    )
  })

  test('log a debug message invokes console.log', () => {
    const spyConsoleLog = jest.spyOn(global.console, 'log').mockImplementation()

    logger.logDebug(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true
    })

    expect(spyConsoleLog).toBeCalledWith(
      expect.stringContaining(`DEBUG:   [${logger.LogPrefix.Backend}]`),
      ...testData
    )
  })

  test('log a debug message appends to log file', () => {
    jest.spyOn(global.console, 'log').mockImplementation()

    logger.logDebug(testData, {
      prefix: logger.LogPrefix.Backend
    })

    expect(appendMessageToLogFile).toBeCalledWith(
      expect.stringContaining(getStringPassedToLogFile('DEBUG'))
    )
  })

  test('log a debug message can be shown as dialog', () => {
    jest.spyOn(global.console, 'log').mockImplementation()

    logger.logDebug(testData, {
      prefix: logger.LogPrefix.Backend,
      skipLogToFile: true,
      showDialog: true
    })

    expect(showErrorBoxModalAuto).toBeCalledWith(
      'Backend',
      getStringPassedToLogFile('DEBUG', true)
    )
  })

  test('log undefined variable works', () => {
    const spyConsoleLog = jest.spyOn(global.console, 'log').mockImplementation()

    logger.logInfo(undefined, {
      prefix: logger.LogPrefix.Backend
    })

    expect(spyConsoleLog).toBeCalledWith(
      expect.stringContaining(`INFO:    [${logger.LogPrefix.Backend}]`),
      undefined
    )

    expect(appendMessageToLogFile).toBeCalledWith(
      expect.stringContaining('INFO:    [Backend]:  undefined')
    )
  })
})
