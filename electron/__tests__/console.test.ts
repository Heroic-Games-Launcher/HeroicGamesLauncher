import {debug, error, info, warning} from '../console';

describe('Console', () => {

  test('log a error message invokes console.error', () => {
    console.error = jest.fn();
    error('My error message');
    expect(console.error).toBeCalledWith('ERROR: My error message');
  })

  test('log a warning message invokes console.log', () => {
    console.log = jest.fn();
    warning('My warning message');
    expect(console.log).toBeCalledWith('WARNING: My warning message');
  })

  test('log a info message invokes console.log', () => {
    console.log = jest.fn();
    info('My info message');
    expect(console.log).toBeCalledWith('INFO: My info message');
  })

  test('log a debug message invokes console.log', () => {
    console.log = jest.fn();
    debug('My debug message');
    expect(console.log).toBeCalledWith('DEBUG: My debug message');
  })
})
