import * as logger from '../logger/logger'

jest.mock('../constants', () => '')

describe('Logger', () => {
  test('log a error message invokes console.error', () => {
    console.error = jest.fn()
    logger.logError('My error message')
    expect(console.error).toBeCalledWith(
      expect.stringContaining('ERROR:   My error message')
    )

    // log with prefix
    logger.logError('My error message', logger.LogPrefix.Frontend)
    expect(console.error).toBeCalledWith(
      expect.stringContaining(
        `ERROR:   [${logger.LogPrefix.Frontend}]: My error message`
      )
    )
  })

  test('log a warning message invokes console.log', () => {
    console.warn = jest.fn()
    logger.logWarning('My warning message')
    expect(console.warn).toBeCalledWith(
      expect.stringContaining('WARNING: My warning message')
    )

    // log with prefix
    logger.logWarning('My warning message', logger.LogPrefix.Legendary)
    expect(console.warn).toBeCalledWith(
      expect.stringContaining(
        `WARNING: [${logger.LogPrefix.Legendary}]: My warning message`
      )
    )
  })

  test('log a info message invokes console.log', () => {
    console.log = jest.fn()
    logger.logInfo('My info message')
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    My info message')
    )

    // log with prefix
    logger.logInfo('My info message', logger.LogPrefix.Frontend)
    expect(console.log).toBeCalledWith(
      expect.stringContaining(
        `INFO:    [${logger.LogPrefix.Frontend}]: My info message`
      )
    )
  })

  test('log a debug message invokes console.log', () => {
    console.log = jest.fn()
    logger.logDebug('My debug message')
    expect(console.log).toBeCalledWith(
      expect.stringContaining('DEBUG:   My debug message')
    )

    // log with prefix
    logger.logDebug('My debug message', logger.LogPrefix.Legendary)
    expect(console.log).toBeCalledWith(
      expect.stringContaining(
        `DEBUG:   [${logger.LogPrefix.Legendary}]: My debug message`
      )
    )
  })
})
