import type { HeroicBackupStageId } from 'common/types/importExport'

export const STAGE_LABELS: Record<HeroicBackupStageId, string> = {
  globalSettings: 'Global settings, themes and fixes',
  perGameSettings: 'Per-game settings',
  credentials: 'Store logins',
  libraryCache: 'Installed games and library',
  sideloadLibrary: 'Sideloaded games',
  wineMetadata: 'Wine / Proton versions'
}

export const ALL_STAGES: HeroicBackupStageId[] = [
  'globalSettings',
  'perGameSettings',
  'credentials',
  'libraryCache',
  'sideloadLibrary',
  'wineMetadata'
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
