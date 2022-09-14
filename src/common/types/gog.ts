export type GogInstallPlatform = 'windows' | 'osx' | 'linux'

// Output of `legendary info AppName --json`
export interface GogInstallInfo {
  game: GameInstallInfo
  manifest: GameManifest
}

interface GameInstallInfo {
  app_name: string
  launch_options: Array<LaunchOption>
  owned_dlc: Array<DLCInfo>
  title: string
  version: string
  buildId: string
}

interface LaunchOption {
  name: string
  parameters: string
}

interface DLCInfo {
  app_name: string
  title: string
}

interface GameManifest {
  app_name: string
  disk_size: number
  download_size: number
  languages: string[]
  versionEtag: string
}

export interface GOGCloudSavesLocation {
  name: string
  location: string
}
