import * as logger from '../logger'
import { appendMessageToLogFile } from '../logfile'
import { showDialogBoxModalAuto } from '../../dialog/dialog'

jest.mock('../logfile')
jest.mock('../../dialog/dialog')

const testData = [
  1234,
  undefined,
  true,
  'normalString',
  ['string1', 'string2'],
  { key1: 100, key2: 'value', key3: { subKey: ['hello', 'world'] } },
  'Error: FAILED'
]

type logLevel = 'WARNING' | 'ERROR' | 'INFO' | 'DEBUG'

function getStringPassedToLogFile(type: logLevel, skipMessagePrefix = false) {
  let messagePrefix = '1234 undefined true normalString string1,string2 {'
  if (!skipMessagePrefix) {
    messagePrefix = `${type}:${' '.repeat(7 - type.length)} [${
      logger.LogPrefix.Backend
    }]:  ${messagePrefix}`
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

  test('log invokes console', () => {
    const spyConsoleError = jest
      .spyOn(global.console, 'error')
      .mockImplementation()
    const spyConsoleLog = jest.spyOn(global.console, 'log').mockImplementation()
    const spyConsoleWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation()

    interface TestCaseProps {
      function: Function
      spyConsole: jest.SpyInstance
    }

    const testCases = new Map<logLevel, TestCaseProps>([
      ['ERROR', { function: logger.logError, spyConsole: spyConsoleError }],
      ['INFO', { function: logger.logInfo, spyConsole: spyConsoleLog }],
      ['WARNING', { function: logger.logWarning, spyConsole: spyConsoleWarn }],
      ['DEBUG', { function: logger.logDebug, spyConsole: spyConsoleLog }]
    ])

    testCases.forEach((props, level) => {
      props.function(testData, {
        prefix: logger.LogPrefix.Backend,
        skipLogToFile: true
      })

      expect(props.spyConsole).toBeCalledWith(
        expect.stringContaining(
          `${level}:${' '.repeat(7 - level.length)} [${
            logger.LogPrefix.Backend
          }]`
        ),
        ...testData
      )
    })
  })

  test('log appends to log file', () => {
    jest.spyOn(global.console, 'error').mockImplementation()
    jest.spyOn(global.console, 'log').mockImplementation()
    jest.spyOn(global.console, 'warn').mockImplementation()

    const testCases = new Map<logLevel, Function>([
      ['ERROR', logger.logError],
      ['INFO', logger.logInfo],
      ['WARNING', logger.logWarning],
      ['DEBUG', logger.logDebug]
    ])

    testCases.forEach((logFunction, level) => {
      logFunction(testData, {
        prefix: logger.LogPrefix.Backend
      })

      expect(appendMessageToLogFile).toBeCalledWith(
        expect.stringContaining(getStringPassedToLogFile(level))
      )
    })
  })

  test('log can be shown as dialog', () => {
    jest.spyOn(global.console, 'error').mockImplementation()
    jest.spyOn(global.console, 'log').mockImplementation()
    jest.spyOn(global.console, 'warn').mockImplementation()

    const testCases = new Map<logLevel, Function>([
      ['ERROR', logger.logError],
      ['INFO', logger.logInfo],
      ['WARNING', logger.logWarning],
      ['DEBUG', logger.logDebug]
    ])

    testCases.forEach((logFunction, level) => {
      logFunction(testData, {
        prefix: logger.LogPrefix.Backend,
        skipLogToFile: true,
        showDialog: true
      })

      expect(showDialogBoxModalAuto).toBeCalledWith({
        title: 'Backend',
        message: getStringPassedToLogFile(level, true),
        type: 'ERROR'
      })
    })
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
