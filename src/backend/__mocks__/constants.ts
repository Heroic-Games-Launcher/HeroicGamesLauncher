const constants = jest.requireActual('../constants')

constants.configStore = {
  has: jest.fn(),
  set: jest.fn(),
  get: jest.fn()
}

constants.currentLogFile = 'current.log'
constants.lastLogFile = 'last.log'

module.exports = constants
export {}
