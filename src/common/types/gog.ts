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

// Data inside the `goggame-appName.info` file in the game installation directory
export interface GOGGameDotInfoFile {
  version: number
  gameId: string
  rootGameId: string
  buildId?: string
  clientId?: string
  standalone: boolean
  dependencyGameId: string
  language: string
  languages?: string[]
  name: string
  playTasks: (FileTask | URLTask)[]
  supportTasks?: (FileTask | URLTask)[]
  osBitness?: ['64']
  overlaySupported?: true
}

interface TaskBase {
  name: string
  isPrimary?: true
  isHidden?: true
  languages?: string[]
  category?: TaskCategory
}

interface FileTask extends TaskBase {
  type: 'FileTask'
  path: string
  workingDir?: string
  arguments?: string
}
interface URLTask extends TaskBase {
  type: 'URLTask'
  link: string
}

type TaskCategory = 'game' | 'tool' | 'document' | 'launcher' | 'other'

export interface GOGGameDotIdFile {
  buildId: string
}

// Data returned from https://remote-config.gog.com/components/galaxy_client/clients/clientId?component_version=2.0.45
export interface GOGClientsResponse {
  version: string
  content: {
    MacOS: FeatureSupport
    Windows: FeatureSupport
    cloudStorage: {
      quota: number
    }
    bases: unknown[]
  }
}

interface FeatureSupport {
  overlay: {
    supported: boolean
  }
  cloudStorage: {
    enabled: boolean
    locations: GOGCloudSavesLocation[]
  }
}

export type SaveFolderVariable =
  | 'INSTALL'
  | 'SAVED_GAMES'
  | 'APPLICATION_DATA_LOCAL'
  | 'APPLICATION_DATA_LOCAL_LOW'
  | 'APPLICATION_DATA_ROAMING'
  | 'DOCUMENTS'
  | 'APPLICATION_SUPPORT'
