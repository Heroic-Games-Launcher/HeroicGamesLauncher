const constants = jest.requireActual('../constants')

constants.configStore = {
  has: jest.fn(),
  set: jest.fn(),
  get: jest.fn()
}

module.exports = constants
export {}
