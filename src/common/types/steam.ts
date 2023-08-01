// Struct we use for loading users from loginusers.vdf
export interface SteamLoginUser {
  id: string
  PersonaName: string
  RememberPassword: string
  WantsOfflineMode: string
  AllowAutoLogin: string
  MostRecent: string
  Timestamp: string
}

// Game object from IPlayerService/GetOwnedGames
export interface OwnedGame {
  appid: number
  name: string
  playtime_forever: number
  playtime_windows_forever: number
  playtime_mac_forever: number
  playtime_linux_forever: number
  rtime_last_played: number
  playtime_disconnected: number
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
    [key: string]: {manifest: string, size: string}
  }
  InstallScripts?: {
    [key: string]: string
  }
}

export interface SteamInstallInfo extends AppManifest {
  install_dir: string
}
