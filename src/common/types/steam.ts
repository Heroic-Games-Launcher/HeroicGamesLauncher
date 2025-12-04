// Struct we use for loading users from loginusers.vdf
export interface SteamLoginUser {
  id: string
  PersonaName: string
  AccountName: string
  RememberPassword: string
  WantsOfflineMode: string
  AllowAutoLogin: string
  MostRecent: string
  Timestamp: string
}

export interface AppManifest {
  appid: string
  Universe: string
  name: string
  StateFlags: string
  installdir: string
  LastUpdated: string
  SizeOnDisk: string
  StagingSize: string
  buildid: string
  LastOwner: string
  UpdateResult: string
  BytesToDownload: string
  BytesDownloaded: string
  BytesStaged: string
  TargetBuildID: string
  AutoUpdateBehavior: string
  AllowOtherDownloadsWhileRunnning: string
  ScheduledAutoUpdate: string
  FullValidateAfterNextUpdate: string
  InstalledDepots: {
    [key: string]: { manifest: string; size: string }
  }
  InstallScripts?: {
    [key: string]: string
  }
}

export interface SteamInstallInfo extends AppManifest {
  install_dir: string
}

export interface SteamAppInfo {
  appid: number
  infoState: number
  updateTime: number
  token: bigint
  changeNumber: number
  data: unknown
}
