import { addHandler } from 'backend/ipc'

import { importExportRollbackStore } from 'backend/constants/key_value_stores'
import { handleExit } from 'backend/utils'
import { userHome } from 'backend/constants/paths'

import { exportHeroicBackup } from './export'
import { validateHeroicBackup } from './validate'
import {
  applyHeroicBackup,
  getWineImportProgressSnapshot,
  rollbackLastImport
} from './apply'

addHandler('getHomeDir', () => Promise.resolve(userHome))

addHandler('getWineImportProgress', () =>
  Promise.resolve(getWineImportProgressSnapshot())
)

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

addHandler('restartHeroic', async () => handleExit(true))
