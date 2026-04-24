import type { Runner } from '../types'

export type HeroicBackupStageId =
  | 'globalSettings'
  | 'perGameSettings'
  | 'credentials'
  | 'libraryCache'
  | 'wineMetadata'
  | 'sideloadLibrary'

export type HeroicBackupPlatform = 'linux' | 'darwin' | 'win32'

export interface HeroicBackupManifest {
  formatVersion: number
  createdAt: string
  heroicVersion: string
  platform: HeroicBackupPlatform
  stages: HeroicBackupStageId[]
  counts: {
    perGameSettings: number
    installedGames: Partial<Record<Runner, number>>
    credentials: CredentialPresence
    fixesIncluded: boolean
    themesIncluded: boolean
    wineVersions: number
    sideloadGames: number
  }
}

export interface CredentialPresence {
  legendary: boolean
  gog: boolean
  nile: boolean
  zoom: boolean
}

export interface HeroicExportOptions {
  outputPath: string
  stages: HeroicBackupStageId[]
}

export interface HeroicExportResult {
  success: boolean
  path?: string
  error?: string
  manifest?: HeroicBackupManifest
}

export type CredentialStatus = 'valid' | 'expired' | 'missing'

export interface CredentialValidation {
  runner: Runner
  present: boolean
  status: CredentialStatus
  displayName?: string
}

export type PathIssueKind = 'missing' | 'broken'

export interface PerGamePathIssue {
  appName: string
  title: string
  runner: Runner
  installPath?: string
  installPathIssue?: PathIssueKind
  prefixPath?: string
  prefixPathIssue?: PathIssueKind
}

export interface WineVersionIssue {
  displayName: string
  version?: string
  downloadable: boolean
}

export interface InstalledGameSummary {
  appName: string
  title: string
  runner: Runner
  installPath: string
}

export interface HeroicBackupValidationReport {
  ok: boolean
  manifest: HeroicBackupManifest
  perGameAppNames: string[]
  gameTitles: Record<string, { title: string; runner: Runner }>
  platformMatches: boolean
  formatSupported: boolean
  credentials: CredentialValidation[]
  pathIssues: PerGamePathIssue[]
  installedOK: InstalledGameSummary[]
  missingWineVersions: WineVersionIssue[]
  errors: string[]
  warnings: string[]
}

export interface PerGamePathOverride {
  appName: string
  installPath?: string
  skipInstallPath?: boolean
  installAfterImport?: boolean
  prefixPath?: string
  useDefaultPrefix?: boolean
}

export interface HeroicApplyOptions {
  sourcePath: string
  stages: HeroicBackupStageId[]
  overwriteGlobalSettings: boolean
  includedAppNames: string[]
  includedCredentials: Partial<Record<Runner, boolean>>
  perGameOverrides: PerGamePathOverride[]
  includedWineVersions: string[]
}

export interface HeroicApplyStageResult {
  stage: HeroicBackupStageId
  ok: boolean
  message?: string
}

export interface HeroicApplyResult {
  ok: boolean
  stages: HeroicApplyStageResult[]
  rollbackPath?: string
  gamesQueuedForDownload: string[]
  warnings: string[]
  errors: string[]
}

export interface HeroicRollbackSnapshot {
  createdAt: string
  archivePath: string
  stages: HeroicBackupStageId[]
  sourceManifest: HeroicBackupManifest
}
