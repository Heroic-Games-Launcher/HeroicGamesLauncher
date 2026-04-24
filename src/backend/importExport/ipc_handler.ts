import { addHandler } from 'backend/ipc'

import { importExportRollbackStore } from 'backend/constants/key_value_stores'
import { app } from 'electron'

import type {
  HeroicApplyResult,
  HeroicBackupValidationReport
} from 'common/types/importExport'

import { exportHeroicBackup } from './export'

addHandler('exportHeroicBackup', (_e, options) => exportHeroicBackup(options))

addHandler(
  'validateHeroicBackup',
  (): Promise<HeroicBackupValidationReport> =>
    Promise.reject(new Error('validateHeroicBackup not implemented yet'))
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
