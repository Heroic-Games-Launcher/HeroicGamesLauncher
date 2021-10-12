interface About {
  description: string
  shortDescription: string
}

export interface AppSettings {
  checkUpdatesInterval: number,
  enableUpdates: boolean
  addDesktopShortcuts: boolean
  addStartMenuShortcuts: boolean
  altLegendaryBin: string
  audioFix: boolean
  autoInstallDxvk: boolean
  autoSyncSaves: boolean
  checkForUpdatesOnStartup: boolean
  customWinePaths: string[]
  darkTrayIcon: boolean
  defaultInstallPath: string
  discordRPC: boolean
  egsLinkedPath: string
  exitToTray: boolean
  enableEsync: boolean
  enableFSR: boolean
  enableFsync: boolean
  enableResizableBar: boolean
  language: string
  launcherArgs: string
  maxRecentGames: number
  maxSharpness: number
  maxWorkers: number
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions: string
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  startInTray: boolean
  useGameMode: boolean
  targetExe: string
  userInfo: UserInfo
  wineCrossoverBottle: string
  winePrefix: string
  wineVersion: WineInstallation
}

export type ExecResult = void | {stderr : string, stdout : string}
export interface ExtraInfo {
  about: About
  reqs: Reqs[]
}

export type GameConfigVersion = 'auto' | 'v0' | 'v0.1'
export interface GameInfo {
  app_name: string
  art_cover: string
  art_logo: string
  art_square: string
  cloud_save_enabled: boolean
  compatible_apps: string[]
  developer: string
  extra: ExtraInfo
  folder_name: string
  install: InstalledInfo
  is_game: boolean
  is_installed: boolean
  is_ue_asset: boolean
  is_ue_plugin: boolean
  is_ue_project: boolean
  namespace: string
  save_folder: string
  title: string
  canRunOffline: boolean
}


type DLCInfo = {
  app_name: string
  title: string
}

type GameInstallInfo = {
  app_name: string
  launch_options: Array<string>
  owned_dlc: Array<DLCInfo>
  title: string
  version: string
}

type Prerequisites = {
  args: string
  name: string
  path: string
}

type GameManifest = {
  app_name: string
  disk_size: number
  download_size: number
  install_tags: Array<string>
  launch_exe: string
  prerequisites: Prerequisites
}
export interface InstallInfo {
  game: GameInstallInfo
  manifest: GameManifest
}

export interface GameSettings {
  audioFix: boolean
  autoInstallDxvk: boolean
  autoSyncSaves: boolean
  enableEsync: boolean
  enableFSR: boolean
  enableFsync: boolean
  enableResizableBar: boolean
  maxSharpness: number
  launcherArgs: string
  nvidiaPrime: boolean
  offlineMode: boolean
  otherOptions: string
  savesPath: string
  showFps: boolean
  showMangohud: boolean
  targetExe: string
  useGameMode: boolean
  wineCrossoverBottle: string
  winePrefix: string
  wineVersion: WineInstallation
}

export interface GameStatus {
  appName: string
  progress?: number | null
  status:
    | 'installing'
    | 'updating'
    | 'launching'
    | 'playing'
    | 'uninstalling'
    | 'repairing'
    | 'done'
    | 'canceled'
    | 'moving'
}

export type GlobalConfigVersion = 'auto' | 'v0'
export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent: string
}
export interface InstalledInfo {
  executable: string | null
  install_path: string | null
  install_size: string | null
  is_dlc: boolean
  version: string | null
}
export interface KeyImage {
  type: string
}

export interface Path {
  filePaths: string[]
}

export interface RawGameJSON {
  app_name: string
  art_cover: string
  art_logo: string
  art_square: string
  cloudSaveEnabled: boolean
  developer: string
  executable: string
  extraInfo: ExtraInfo
  folderName: string
  install_path: string
  install_size: number
  isInstalled: boolean
  is_dlc: boolean
  saveFolder: string
  title: string
  version: string
}

interface Reqs {
  minimum: string
  recommended: string
  title: string
}

export type SyncType = 'Download' | 'Upload' | 'Force download' | 'Force upload'


export type UserInfo = {
  account_id?: string
  displayName?: string
  epicId?: string
  name?: string
}
export interface WineInstallation {
  bin: string
  name: string
}

export interface InstallArgs {
  path: string
  installDlcs?: boolean
  sdlList?: Array<string>
}

export interface InstallParams {
  appName: string
  path: string
  installDlcs?: boolean
  sdlList?: Array<string>
}


/**
 * Type definitions for Epic Store's promotion API
 */

 interface FreeKeyImage {
  type: string;
  url?: string;
}

interface Seller {
  id: string;
  name: string;
}

interface Item {
  id: string;
  namespace: string;
}

interface CustomAttribute {
  key: string;
  value: string;
}

interface Category {
  path: string;
}

interface Tag {
  id: string;
}

interface Mapping {
  pageSlug: string;
  pageType: string;
}

interface CatalogNs {
  mappings: Mapping[];
}

interface CurrencyInfo {
  decimals: number;
}

interface FmtPrice {
  originalPrice: string;
  discountPrice: string;
  intermediatePrice: string;
}

interface TotalPrice {
  discountPrice: number;
  originalPrice: number;
  voucherDiscount: number;
  discount: number;
  currencyCode: string;
  currencyInfo: CurrencyInfo;
  fmtPrice: FmtPrice;
}

interface DiscountSetting {
  discountType: string;
}

interface AppliedRule {
  id: string;
  endDate: Date | string;
  discountSetting: DiscountSetting;
}

interface LineOffer {
  appliedRules: AppliedRule[];
}

interface Price {
  totalPrice: TotalPrice;
  lineOffers: LineOffer[];
}

interface DiscountSetting2 {
  discountType: string;
  discountPercentage: number;
}

interface PromotionalOffer2 {
  startDate: Date | string;
  endDate: Date | string;
  discountSetting: DiscountSetting2;
}

interface PromotionalOffer {
  promotionalOffers: PromotionalOffer2[];
}

interface DiscountSetting3 {
  discountType: string;
  discountPercentage: number;
}

interface PromotionalOffer3 {
  startDate: Date | string;
  endDate: Date | string;
  discountSetting: DiscountSetting3;
}

interface UpcomingPromotionalOffer {
  promotionalOffers: PromotionalOffer3[];
}

interface Promotions {
  promotionalOffers: PromotionalOffer[];
  upcomingPromotionalOffers: UpcomingPromotionalOffer[];
}

export interface FreeGameElement {
  title: string;
  id: string;
  namespace: string;
  description: string;
  effectiveDate: Date | string;
  offerType: string;
  expiryDate?: string | null;
  status: string;
  isCodeRedemptionOnly: boolean;
  keyImages: FreeKeyImage[];
  seller: Seller;
  productSlug: string;
  urlSlug: string;
  url?: string | null;
  items: Item[];
  customAttributes: CustomAttribute[];
  categories: Category[];
  tags: Tag[];
  catalogNs: CatalogNs;
  offerMappings: never[];
  price: Price;
  promotions: Promotions | null;
}

export interface FreeGameResponse {
  elements: FreeGameElement[];
}