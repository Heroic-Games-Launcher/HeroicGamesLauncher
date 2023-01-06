/**
 * Defines from where the version comes
 */
export type Type =
  | 'Wine-GE'
  | 'Proton-GE'
  | 'Soda-Bottles'
  | 'DXVK'
  | 'DXVK-Async'
  | 'DXVK-NVAPI'
  | 'VKD3D'

/**
 * Interface contains information about a version
 * - version
 * - type (wine, proton, lutris, ge ...)
 * - date
 * - download link
 * - checksum link
 * - size (download and disk)
 */
export interface VersionInfo {
  version: string
  type: Type
  date: string
  download: string
  downsize: number
  disksize: number
  checksum: string
}

/**
 * Enum for the supported repositorys
 */
export enum Repositories {
  WINEGE,
  PROTONGE,
  SODA_BOTTLES,
  DXVK,
  DXVK_ASYNC,
  DXVK_NVAPI,
  VKD3D
}

/**
 * Type for the progress callback state
 */
export type State = 'downloading' | 'unzipping' | 'idle'

/**
 * Interface for the information that progress callback returns
 */
export interface ProgressInfo {
  percentage: number
  avgSpeed: number
  eta: number
}

export interface ToolVersionInfo extends VersionInfo {
  isInstalled: boolean
  hasUpdate: boolean
  installDir: string
}
