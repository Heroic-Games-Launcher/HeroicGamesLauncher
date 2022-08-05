const logfile = jest.requireActual('../logfile')

logfile.createNewLogFileAndClearOldOnces = jest.fn().mockReturnValue('')
logfile.appendMessageToLogFile = jest.fn()

module.exports = logfile
export {}
