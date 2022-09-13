const logger = jest.requireActual('../logger')

logger.logError = jest.fn()
logger.logInfo = jest.fn()
logger.logDebug = jest.fn()
logger.logWarning = jest.fn()

module.exports = logger
export {}
