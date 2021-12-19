import { logDebug, logError, logInfo, logWarning } from '../logger'

describe('Console', () => {
  test('log a error message invokes console.error', () => {
    console.error = jest.fn()
    logError('My error message')
    expect(console.error).toBeCalledWith('ERROR: My error message')
  })

  test('log a warning message invokes console.log', () => {
    console.log = jest.fn()
    logWarning('My warning message')
    expect(console.log).toBeCalledWith('WARNING: My warning message')
  })

  test('log a info message invokes console.log', () => {
    console.log = jest.fn()
    logInfo('My info message')
    expect(console.log).toBeCalledWith('INFO: My info message')
  })

  test('log a debug message invokes console.log', () => {
    console.log = jest.fn()
    logDebug('My debug message')
    expect(console.log).toBeCalledWith('DEBUG: My debug message')
  })
})
