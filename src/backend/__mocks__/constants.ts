const constants = jest.requireActual('../constants')

constants.currentLogFile = 'current.log'
constants.lastLogFile = 'last.log'
constants.isSteamDeckGameMode = false

module.exports = constants
export {}
