import tmp from 'tmp'
import { join } from 'path'

const logfile = jest.requireActual<typeof import('../logfile')>('../logfile')

const tmpLogDir = tmp.dirSync({ unsafeCleanup: true }).name

logfile.appendMessageToLogFile = jest.fn()
logfile.initLogfile = jest.fn()
logfile.getLogFile = (appNameOrRunner) =>
  join(tmpLogDir, appNameOrRunner + '.log')

module.exports = logfile
export {}
