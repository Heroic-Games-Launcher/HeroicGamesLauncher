import { join } from 'path'
import os from 'os'

import { app } from 'electron'

/*
Electron's default log path for Linux is inside `~/.config/`, which is not
where they're intended to be stored. See the XDG specification on what
belongs in XDG_STATE_HOME here:
https://specifications.freedesktop.org/basedir-spec/latest/#variables
*/
const logBasePath =
  process.platform === 'linux'
    ? join(
        process.env.XDG_STATE_HOME ?? `${os.homedir()}/.local/state`,
        'Heroic',
        'logs'
      )
    : app.getPath('logs')
const componentLogFilePath = join(logBasePath, 'components.log')

export { logBasePath, componentLogFilePath }
