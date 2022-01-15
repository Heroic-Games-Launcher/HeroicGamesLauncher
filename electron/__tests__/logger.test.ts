import { logDebug, logError, logInfo, LogPrefix, logWarning } from '../logger'

describe('Console', () => {
  test('log a error message invokes console.error', () => {
    console.error = jest.fn()
    logError('My error message')
    expect(console.error).toBeCalledWith('ERROR: My error message')

    // log with prefix
    logError('My error message', LogPrefix.Frontend)
    expect(console.error).toBeCalledWith(
      `ERROR: [${LogPrefix.Frontend}]: My error message`
    )
  })

  test('log a warning message invokes console.log', () => {
    console.warn = jest.fn()
    logWarning('My warning message')
    expect(console.warn).toBeCalledWith('WARNING: My warning message')

    // log with prefix
    logWarning('My warning message', LogPrefix.Legendary)
    expect(console.warn).toBeCalledWith(
      `WARNING: [${LogPrefix.Legendary}]: My warning message`
    )
  })

  test('log a info message invokes console.log', () => {
    console.log = jest.fn()
    logInfo('My info message')
    expect(console.log).toBeCalledWith('INFO: My info message')

    // log with prefix
    logInfo('My info message', LogPrefix.Frontend)
    expect(console.log).toBeCalledWith(
      `INFO: [${LogPrefix.Frontend}]: My info message`
    )
  })

  test('log a debug message invokes console.log', () => {
    console.log = jest.fn()
    logDebug('My debug message')
    expect(console.log).toBeCalledWith('DEBUG: My debug message')

    // log with prefix
    logDebug('My debug message', LogPrefix.Legendary)
    expect(console.log).toBeCalledWith(
      `DEBUG: [${LogPrefix.Legendary}]: My debug message`
    )
  })
})
