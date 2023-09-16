import { LaunchOption } from 'common/types'

export type GogInstallPlatform = 'windows' | 'osx' | 'linux'

// Output of `legendary info AppName --json`
export interface GogInstallInfo {
  game: GameInstallInfo
  manifest: GameManifest
}

export interface GOGSessionSyncQueueItem {
  appName: string
  session_date: number
  time: number
}

interface GameInstallInfo {
  app_name: string
  launch_options: Array<LaunchOption>
  owned_dlc: Array<DLCInfo>
  title: string
  version: string
  branches: Array<string | null>
  buildId: string
}

type PerLanguageSize = {
  '*': { download_size: number; disk_size: number }
  [key: string]: { download_size: number; disk_size: number }
}

// Raw output of gogdl info command
export interface GOGDLInstallInfo {
  size: PerLanguageSize
  download_size?: number // only linux native
  disk_size?: number
  languages: Array<string>
  dlcs: Array<{ title: string; id: string; size: PerLanguageSize }>
  buildId: string
  os: GogInstallPlatform
  branch: string | null
  dependencies: Array<string>
  versionName: string
  versionEtag: string
  folder_name: string
  available_branches: Array<string>
  builds: {
    items: Array<BuildItem>
    total_count: number
    count: number
    has_private_branches: boolean
  }
}

export interface DLCInfo {
  app_name: string
  title: string
  perLangSize: PerLanguageSize
}

interface GameManifest {
  app_name: string
  disk_size: number
  download_size: number
  perLangSize: PerLanguageSize
  languages: string[]
  versionEtag: string
  dependencies: string[]
  builds?: BuildItem[]
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
  name?: string
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

// Data returned from https://embed.gog.com/userData.json
export interface UserData {
  country: string
  currencies: Currency[]
  selectedCurrency: Currency
  preferredLanguage: {
    code: string
    name: string
  }
  ratingBrand: string
  isLoggedIn: true
  checksum: {
    cart: string | null
    games: string | null
    wishlist: string | null
    reviews_votes: string | null
    games_rating: string | null
  }
  updates: {
    messages: number
    pendingFriendRequests: number
    unreadChatMessages: number
    products: number
    total: number
  }
  userId: string
  username: string
  galaxyUserId: string
  email?: string
  // NOTE: This URL doesn't seem to work?
  avatar: string
  walletBalancy: {
    currency: string
    amount: number
  }
  purchasedItems: {
    games: number
    movies: number
  }
  whishlistedItems: number
  friends: Friend[]
  personalizedProductPrices: []
  personalizedSeriesPrices: []
}

interface Currency {
  code: string
  symbol: string
}

interface Friend {
  username: string
  userSince: number
  galaxyId: string
  avatar: string
}

// Data returned by https://gamesdb.gog.com/platforms/$PLATFORM/external_releases/$APP_ID
interface GamesDBDataBase {
  id: string
  game_id: string
  dlcs_ids: string[]
  // TODO; Was always `null` for all of my games, probably `string | null`
  parent_id: null
  first_release_date: string
  title: LanguageMapper<string>
  sorting_title: LanguageMapper<string>
  type: 'game' | 'dlc' | 'spam'
  summary: LanguageMapper<string>
  videos: {
    provider: 'youtube'
    video_id: string
    thumbnail_id: string
    name: string | null
  }[]
  game_modes: SingleLanguageDataObject[]
  logo: {
    url_format: string
  }
  series: SingleLanguageDataObject
}

export interface GamesDBData extends GamesDBDataBase {
  platform_id: string
  external_id: string
  dlcs: Release[]
  avaliable_languages: {
    code: string
  }[]
  supported_operating_systems: SingleLanguageDataObjectWithoutId[]
  game: GamesDBDataInner
  etag: string
}

interface GamesDBDataInner extends GamesDBDataBase {
  releases: Release[]
  developers_ids: string[]
  developers: SingleLanguageDataObject[]
  publishers_ids: string[]
  publishers: SingleLanguageDataObject[]
  genres_ids: string[]
  genres: MultiLanguageDataObject[]
  themes_ids: string[]
  themes: MultiLanguageDataObject[]
  screenshots: {
    url_format: string
  }[]
  artworks: {
    url_format: string
  }[]
  visible_in_library: true
  aggregated_rating: number | null
  horizontal_artwork: {
    url_format: string
  }
  background: {
    url_format: string
  }
  vertical_cover: {
    url_format: string
  }
  cover: {
    url_format: string
  }
  icon?: {
    url_format: string
  }
  square_icon: {
    url_format: string
  }
  global_popularity_all_time: number
  global_popularity_current: number
}

interface SingleLanguageDataObject {
  id: string
  name: string
  slug: string
}
type SingleLanguageDataObjectWithoutId = Omit<SingleLanguageDataObject, 'id'>

interface MultiLanguageDataObject {
  id: string
  name: LanguageMapper<string>
  slug: string
}
// Might need this later
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type MultiLanguageDataObjectWithoutId = Omit<MultiLanguageDataObject, 'id'>

type LanguageMapper<T> = {
  '*': T
  'en-US': T
  [code: string]: T | undefined
}

interface Release {
  id: string
  platform_id: string
  external_id: string
  release_per_platform_id: string
}

// Data returned from https://galaxy-library.gog.com/users/${credentials.user_id}/releases
export interface Library {
  total_count: number
  next_page_token?: string
  page_token?: string
  limit: number
  items: Array<GalaxyLibraryEntry>
}

export interface GalaxyLibraryEntry {
  platform_id: string
  external_id: string
  origin: string
  owned: boolean
  date_created: number
  owned_since: number | null
  certificate: string
}

// One item from https://content-system.gog.com/products/GAMEID/os/windows/builds?generation=2 endpoint
export interface BuildItem {
  build_id: string
  product_id: string
  os: 'windows' | 'osx' | 'linux' // Linux is not yet supported but it's good to have it here
  branch: string | null
  version_name: string
  tags: string[]
  public: boolean
  date_published: string
  generation: number
  link?: string
  // Visible only with _version=2 parameter
  urls?: {
    endpoint_name: string
    url: string
    url_format: string
    parameters: string
    fallback_only: boolean
    max_fails: number
    priority: number
  }[]
}

interface ProductsEndpointFile {
  id: string
  size: number
  downlink: string
}

interface ProductsEndpointBonusContent {
  id: number
  name: string
  type: string
  count: number
  total_size: number
  files: Array<ProductsEndpointFile>
}

interface ProductsEndpointInstaller {
  id: string
  name: string
  os: 'windows' | 'osx' | 'linux'
  language: string
  language_full: string
  version: string
  total_size: number
  files: Array<ProductsEndpointFile>
}

export interface ProductsEndpointData {
  id: number
  title: string
  purchase_link: string
  slug: string
  content_system_compatibility: {
    windows: boolean
    osx: boolean
    linux: boolean
  }
  languages: { [key: string]: string }
  links: {
    purchase_link: string
    product_card: string
    support: string
    forum: string
  }
  in_development: {
    active: boolean
    until: number | null
  }
  is_secret: boolean
  is_installable: boolean
  game_type: 'game' | 'dlc' | 'pack'
  is_pre_order: boolean
  release_date: string
  images: {
    background: string
    logo: string
    logo2x: string
    icon: string
    sidebarIcon: string
    sidebarIcon2x: string
    menuNotificationAv: string
    menuNotificationAv2: string
  }
  dlcs: {
    products: Array<{
      id: number
      link: string
      expanded_link: string
    }>
    all_products_url: string
    expanded_all_products_url: string
  }
  // Requires expanded description
  description?: {
    lead: string
    full: string
    whats_cool_about_it: string
  }
  // Requires downloads
  downloads?: {
    installers: Array<ProductsEndpointInstaller>
    patches: Array<ProductsEndpointInstaller>
    language_packs: Array<ProductsEndpointInstaller>
    bonus_content: Array<ProductsEndpointBonusContent>
  }
  changelog?: string
}

// MANIFESTS

export interface GOGv1Manifest {
  version: 1
  product: {
    timestamp: number
    depots: Array<
      | {
          languages: string[]
          size: string
          gameIDs: string[]
          systems: string[]
          manifest: string
        }
      | { redist: string; executable: string; argument: string; size: string }
    >

    support_commands: {
      languages: string[]
      executable: string
      gameID: string
      argument: string
      systems: string[]
    }[]
    installDirectory: string
    rootGameID: string
    gameIDs: {
      gameID: string
      name: { [lang: string]: string }
      dependencies: string[]
      standalone: boolean
    }[]
    projectName: string
  }
}

export interface GOGv2Manifest {
  version: 2
  baseProductId: string
  buildId: string
  clientId?: string
  clientSecret?: string
  dependencies?: string[]
  depots: Array<{
    compressedSize: number
    languages: string[]
    manifest: string
    productId: string
    size: number
    isGogDepot?: boolean
  }>
  platform: GogInstallPlatform
  installDirectory: string
  products: Array<{
    name: string
    productId: string
    temp_arguments: string
    temp_executable: string
  }>
  tags?: string[]
  scriptInterpreter?: boolean
}

export interface GOGRedistManifest {
  depots: Array<{
    compressedSize: number
    dependencyId: string
    executable: { arguments: string; path: string }
    internal: boolean
    readableName: string
    manifest: string
    signature: string
    size: number
  }>
  build_id?: string
  HGLInstalled?: string[]
}

export interface GOGCredentials {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  session_id: string
  refresh_token: string
  user_id: string
  loginType: number
}
