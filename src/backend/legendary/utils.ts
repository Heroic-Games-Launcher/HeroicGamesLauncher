import {
  createAbortController,
  deleteAbortController
} from '../utils/abort/abort'
import { runLegendaryCommand } from '../legendary/library'
import { join } from 'path'
import { fixAsarPath, publicDir } from '../constants'
import { splitPathAndName } from '../utils/format/format'
import { GlobalConfig } from 'backend/config'

async function getLegendaryVersion() {
  const abortID = 'legendary-version'
  const { stdout, error, abort } = await runLegendaryCommand(
    ['--version'],
    createAbortController(abortID)
  )

  deleteAbortController(abortID)

  if (error || abort) {
    return 'invalid'
  }

  return stdout
    .split('legendary version')[1]
    .replaceAll('"', '')
    .replaceAll(', codename', '')
    .replaceAll('\n', '')
}

function getLegendaryBin(): { dir: string; bin: string } {
  const settings = GlobalConfig.get().getSettings()
  if (settings?.altLegendaryBin) {
    return splitPathAndName(settings.altLegendaryBin)
  }
  return splitPathAndName(
    fixAsarPath(join(publicDir, 'bin', process.platform, 'legendary'))
  )
}

export { getLegendaryVersion, getLegendaryBin }
