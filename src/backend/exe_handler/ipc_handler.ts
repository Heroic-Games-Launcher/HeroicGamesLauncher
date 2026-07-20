import { addHandler } from '../ipc'

import { launchExe } from '.'

addHandler('exe_handler.launchWithExeFile', (_e, exePath, appName, runner) =>
  launchExe(exePath, appName, runner)
)
