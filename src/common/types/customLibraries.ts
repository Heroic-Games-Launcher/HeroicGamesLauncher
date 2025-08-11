interface GameInstallInfo {
  app_name: string
  title: string
  version: string
  owned_dlc: Array<{ app_name: string; title: string }>
}

interface GameManifest {
  app_name: string
  disk_size: number
  download_size: number
  languages: Array<string>
  versionEtag: string
}

export interface CustomLibraryInstallInfo {
  game: GameInstallInfo
  manifest: GameManifest
}
