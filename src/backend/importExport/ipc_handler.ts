import { addHandler } from 'backend/ipc'

import { importExportRollbackStore } from 'backend/constants/key_value_stores'
import { app } from 'electron'

import { exportHeroicBackup } from './export'
import { validateHeroicBackup } from './validate'
import { applyHeroicBackup, rollbackLastImport } from './apply'

addHandler('exportHeroicBackup', (_e, options) => exportHeroicBackup(options))

addHandler('validateHeroicBackup', (_e, sourcePath) =>
  Promise.resolve(validateHeroicBackup(sourcePath))
)

addHandler('applyHeroicBackup', (_e, options) => applyHeroicBackup(options))

addHandler('getRollbackSnapshot', () =>
  Promise.resolve(
    importExportRollbackStore.get_nodefault('lastSnapshot') ?? null
  )
)

addHandler('rollbackHeroicBackup', () => rollbackLastImport())

addHandler('restartHeroic', () => {
  app.relaunch()
  app.exit(0)
  return Promise.resolve()
})
