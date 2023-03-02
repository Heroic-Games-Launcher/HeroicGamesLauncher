import { fixAsarPath, publicDir } from '../constants'
import {
  createAbortController,
  deleteAbortController,
  splitPathAndName
} from '../utils'
import { join } from 'path'
import { runGogdlCommand } from './library'
import { GlobalConfig } from 'backend/config'

function getGOGdlBin(): { dir: string; bin: string } {
  const settings = GlobalConfig.get().getSettings()
  if (settings?.altGogdlBin) {
    return splitPathAndName(settings.altGogdlBin)
  }
  return splitPathAndName(
    fixAsarPath(join(publicDir, 'bin', process.platform, 'gogdl'))
  )
}

const getGogdlVersion = async () => {
  const abortID = 'gogdl-version'
  const { stdout, error } = await runGogdlCommand(
    ['--version'],
    createAbortController(abortID)
  )

  deleteAbortController(abortID)

  if (error) {
    return 'invalid'
  }

  return stdout
}

export { getGOGdlBin, getGogdlVersion }
