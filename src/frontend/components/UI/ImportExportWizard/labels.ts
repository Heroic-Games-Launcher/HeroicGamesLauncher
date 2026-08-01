import type { TFunction } from 'i18next'

import type { HeroicBackupStageId } from 'common/types/importExport'

export function stageLabels(
  t: TFunction<'translation'>
): Record<HeroicBackupStageId, string> {
  return {
    globalSettings: t('import-export.stage.globalSettings', 'Global settings'),
    perGameSettings: t(
      'import-export.stage.perGameSettings',
      'Per-game settings'
    ),
    credentials: t('import-export.stage.credentials', 'Store logins'),
    libraryCache: t(
      'import-export.stage.libraryCache',
      'Installed games and library'
    ),
    sideloadLibrary: t(
      'import-export.stage.sideloadLibrary',
      'Sideloaded games'
    ),
    wineMetadata: t(
      'import-export.stage.wineMetadata',
      'Wine / Proton versions'
    ),
    categories: t('import-export.stage.categories', 'Custom categories')
  }
}

export const ALL_STAGES: HeroicBackupStageId[] = [
  'globalSettings',
  'perGameSettings',
  'credentials',
  'libraryCache',
  'sideloadLibrary',
  'wineMetadata',
  'categories'
]

export function timestampedBackupName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const ss = pad(now.getSeconds())
  return `heroic-backup-${y}-${m}-${d}_${hh}-${mm}-${ss}.zip`
}
