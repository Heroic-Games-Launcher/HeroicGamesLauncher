import type { SerializedLibraryInfo } from './schemas'

type LibraryInfo = SerializedLibraryInfo & {
  freeSpace: number
  totalSpace: number
  removable: boolean
  type?: 'internal' | 'removable'
}

export type { LibraryInfo }
