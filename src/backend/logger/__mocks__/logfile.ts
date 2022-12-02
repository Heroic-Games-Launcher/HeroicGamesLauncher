const logfile = jest.requireActual('../logfile')

logfile.createNewLogFileAndClearOldOnes = jest.fn().mockReturnValue('')
logfile.appendMessageToLogFile = jest.fn()

module.exports = logfile
export {}
