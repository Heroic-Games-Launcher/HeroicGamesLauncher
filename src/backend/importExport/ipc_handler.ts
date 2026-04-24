import { addHandler } from 'backend/ipc'
import { logError, LogPrefix } from 'backend/logger'

import { importExportRollbackStore } from 'backend/constants/key_value_stores'
import { app } from 'electron'

import type {
  HeroicApplyResult,
  HeroicBackupValidationReport,
  HeroicExportResult
} from 'common/types/importExport'

addHandler('exportHeroicBackup', (): Promise<HeroicExportResult> => {
  logError('exportHeroicBackup not implemented yet', LogPrefix.ImportExport)
  return Promise.resolve({ success: false, error: 'not implemented' })
})

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
