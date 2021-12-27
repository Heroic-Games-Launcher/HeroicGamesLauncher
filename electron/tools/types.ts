/**
 * Interface contains information about a release
 * - version
 * - date
 * - download link
 * - checksum link
 * - size (download and disk)
 * - update available
 * - installed
 * - install directory
 */
export interface ToolsInfo {
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
