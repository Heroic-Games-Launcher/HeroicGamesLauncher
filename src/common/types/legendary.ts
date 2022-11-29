// Types specifically for Legendary/Epic

// Possible platforms for `legendary list --platform`
export type LegendaryInstallPlatform = 'Windows' | 'Win32' | 'Mac'

// Metadata in `~/.config/legendary/installed.json`
export interface InstalledJsonMetadata {
  app_name: string
  base_urls: string[]
  can_run_offline: boolean
  egl_guid: string
  executable: string
  install_path: string
  install_size: number
  install_tags: string[]
  is_dlc: boolean
  launch_parameters: string
  manifest_path?: string
  needs_verification: boolean
  platform: LegendaryInstallPlatform
  prereq_info: Prerequisite[]
  requires_ot: boolean
  save_path?: string
  title: string
  version: string
}

// Metadata in `~/.config/legendary/metadata/AppName.json`
export interface GameMetadata {
  app_name: string
  app_title: string
  asset_infos: Record<LegendaryInstallPlatform, AssetInfo>
  base_urls: string[]
  metadata: GameMetadataInner
}

interface AssetInfo {
  app_name: string
  asset_id: string
  build_version: string
  catalog_item_id: string
  label_name: string
  // TODO: Find out what this does, so far I've only seen it as {} in the JSON
  metadata: Record<string, unknown>
  namespace: string
}

interface GameMetadataInner {
  // TODO: So far every age gating has been {}
  ageGatings: Record<string, unknown>
  applicationId: string
  categories: Record<'path', string>[]
  creationDate: string
  customAttributes: Record<CustomAttributeType, CustomAttributeValue>
  description: string
  developer: string
  developerId: string
  dlcItemList?: GameMetadataInner[]
  endOfSupport: false
  entitlementName: string
  entitlementType: 'EXECUTABLE'
  eulaIds: ('fn' | 'egstore')[]
  id: string
  itemType?: 'DURABLE'
  keyImages: KeyImage[]
  lastModifiedDate: string
  mainGameItem?: GameMetadataInner
  longDescription?: string
  namespace: string
  releaseInfo: ReleaseInfo[]
  requiresSecureAccount?: boolean
  selfRefundable?: boolean
  status: 'ACTIVE'
  technicalDetails?: string
  title: string
  unsearchable: boolean
}

type CustomAttributeType =
  | 'AppAccessType'
  | 'CanRunOffline'
  | 'CanSkipKoreanIdVerification'
  | 'CloudIncludeList'
  | 'CloudSaveFolder'
  | 'FolderName'
  | 'HasGateKeeper'
  | 'LaunchSocialOnFirstInstall'
  | 'MonitorPresence'
  | 'PresenceId'
  | 'RequirementsJson'
  | 'SysTrayRestore'
  | 'UseAccessControl'
  | 'com.epicgames.portal.product.privacyPolicyUrl'
  | 'com.epicgames.portal.product.websiteUrl'
  | 'extraLaunchOption_001_Args'
  | 'extraLaunchOption_001_Name'
  | 'ThirdPartyManagedApp'

interface CustomAttributeValue {
  type: 'STRING'
  value: string
}

interface KeyImage {
  height: number
  md5: string
  size: number
  type: string
  uploadedDate: string
  url: string
  width: number
}

interface ReleaseInfo {
  appId: string
  id: string
  platform: LegendaryInstallPlatform[]
}

// Output of `legendary info AppName --json`
export interface LegendaryInstallInfo {
  game: GameInstallInfo
  manifest: GameManifest
}

interface GameInstallInfo {
  app_name: string
  cloud_save_folder?: string
  cloud_save_folder_mac?: string
  cloud_saves_supported: boolean
  external_activation: string
  is_dlc: boolean
  launch_options: Array<LaunchOption>
  owned_dlc: Array<DLCInfo>
  platform_versions: Record<LegendaryInstallPlatform, string>
  title: string
  version: string
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
  build_id: string
  build_version: string
  disk_size: number
  download_size: number
  feature_level: number
  install_tags: Array<string>
  launch_command: string
  launch_exe: string
  num_chunks: number
  num_files: number
  prerequisites?: Prerequisite
  size: number
  tag_disk_size: TagInfo[]
  tag_download_size: TagInfo[]
  type: 'binary'
  version: number
}

interface Prerequisite {
  args: string
  ids: string[]
  name: string
  path: string
}

interface TagInfo {
  // The tag this info describes
  tag: string
  // How many files are included in this tag
  count: number
  // How big the tag is (in bytes)
  size: number
}
