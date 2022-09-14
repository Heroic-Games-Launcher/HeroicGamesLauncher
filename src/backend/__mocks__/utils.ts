const utils = jest.requireActual('../utils')

utils.showErrorBoxModalAuto = jest.fn()
utils.notify = jest.fn()

module.exports = utils
export {}
