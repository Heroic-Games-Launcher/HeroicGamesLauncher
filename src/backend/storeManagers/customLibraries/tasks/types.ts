export type CustomLibraryTaskType =
  | 'download'
  | 'extract'
  | 'run'
  | 'delete'
  | 'move'

interface BaseCustomLibraryTask {
  type: CustomLibraryTaskType
}

export interface DownloadTask extends BaseCustomLibraryTask {
  type: 'download'
  url: string
  filename?: string
  destination?: string
}

export interface ExtractTask extends BaseCustomLibraryTask {
  type: 'extract'
  source: string
  destination?: string
}

export interface RunTask extends BaseCustomLibraryTask {
  type: 'run'
  executable: string
  args?: string[]
}

export interface MoveTask extends BaseCustomLibraryTask {
  type: 'move'
  source: string
  destination: string
}

export type CustomLibraryTask = DownloadTask | ExtractTask | RunTask | MoveTask
