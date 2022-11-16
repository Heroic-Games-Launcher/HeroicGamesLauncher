const constants = jest.requireActual('../constants')

constants.currentLogFile = 'current.log'
constants.lastLogFile = 'last.log'

module.exports = constants
export {}
