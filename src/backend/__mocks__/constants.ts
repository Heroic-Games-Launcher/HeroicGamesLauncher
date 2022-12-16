const constants = jest.requireActual('../constants')

constants.configStore = {
  has: jest.fn(),
  set: jest.fn(),
  get: jest.fn()
}

constants.currentLogFile = 'current.log'
constants.lastLogFile = 'last.log'
constants.isSteamDeckGameMode = false

module.exports = constants
export {}
