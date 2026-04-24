import { addHandler } from 'backend/ipc'

import { importExportRollbackStore } from 'backend/constants/key_value_stores'
import { app } from 'electron'

import type { HeroicApplyResult } from 'common/types/importExport'

import { exportHeroicBackup } from './export'
import { validateHeroicBackup } from './validate'

addHandler('exportHeroicBackup', (_e, options) => exportHeroicBackup(options))

addHandler('validateHeroicBackup', (_e, sourcePath) =>
  Promise.resolve(validateHeroicBackup(sourcePath))
)

addHandler('applyHeroicBackup', (): Promise<HeroicApplyResult> => {
  return Promise.resolve({
    ok: false,
    stages: [],
    gamesQueuedForDownload: [],
    warnings: [],
    errors: ['applyHeroicBackup not implemented yet']
  })
})

addHandler('getRollbackSnapshot', () => {
  return Promise.resolve(
    importExportRollbackStore.get_nodefault('lastSnapshot') ?? null
  )
})

addHandler('rollbackHeroicBackup', (): Promise<HeroicApplyResult> => {
  return Promise.resolve({
    ok: false,
    stages: [],
    gamesQueuedForDownload: [],
    warnings: [],
    errors: ['rollbackHeroicBackup not implemented yet']
  })
})

addHandler('restartHeroic', () => {
  app.relaunch()
  app.exit(0)
  return Promise.resolve()
})
