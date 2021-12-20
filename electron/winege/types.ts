/**
 * Interface contains information about a release
 * - version
 * - date
 * - download link
 * - checksum link
 * - size
 * - update available
 * - installed
 * - install directory
 */
export interface WineGEInfo {
  version: string
  date: string
  download: string
  downsize: number
  disksize: number
  checksum: string
  isInstalled: boolean
  hasUpdate: boolean
  installDir: string
}
