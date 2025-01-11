import { app } from 'electron'
import { mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { dirSync } from 'tmp'

let configFolder = app.getPath('appData')
// If we're running tests, we want a config folder independent of the normal
// user configuration
if (process.env.CI === 'e2e') {
  const temp_dir = dirSync({ unsafeCleanup: true })
  console.log(
    `CI is set to "e2e", storing Heroic config files in ${temp_dir.name}`
  )
  configFolder = temp_dir.name
  mkdirSync(join(configFolder, 'heroic'))
}

export const appFolder = join(configFolder, 'heroic')
export const userDataPath = app.getPath('userData')
export const toolsPath = join(appFolder, 'tools')
export const epicRedistPath = join(toolsPath, 'redist', 'legendary')
export const runtimePath = join(toolsPath, 'runtimes')
export const defaultUmuPath = join(runtimePath, 'umu', 'umu_run.py')
