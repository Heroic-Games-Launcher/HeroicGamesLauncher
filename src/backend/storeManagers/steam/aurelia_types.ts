// Data shapes

/** One `{event:"progress"}` line emitted by install/update/verify/move. */
export interface AureliaProgressEvent {
  event?: string
  state?: string
  bytes_downloaded?: number
  total_bytes?: number
  percent?: number
  speed_bps?: number
  eta_seconds?: number | null
  file?: string
}

/** Artwork URLs baked into Aurelia's responses (see `aurelia list`/`info`). */
interface AureliaAssets {
  header?: string
  capsule?: string
  hero?: string
  background?: string
  logo?: string
}

export interface AureliaLibraryGame {
  app_id: number
  name: string
  playtime_forever_minutes?: number
  is_installed: boolean
  install_path?: string | null
  update_available?: boolean
  update_queued?: boolean
  active_branch?: string
  is_owned?: boolean
  is_family_shared?: boolean
  online_required?: boolean | null
  assets?: AureliaAssets
  store_url?: string
  platform?: string
}

interface AureliaDlcEntry {
  app_id: number
  name?: string | null
  owned?: boolean | null
  installed?: boolean | null
  disabled?: boolean | null
  image_url?: string
  image_fallback_url?: string
  store_url?: string
}

export interface AureliaDlcResponse {
  app_id: number
  dlc: AureliaDlcEntry[]
}

export interface AureliaInfoResponse {
  app_id: number
  name?: string
  type?: string
  is_free?: boolean
  description?: string
  full_description?: string
  developers?: string[]
  publishers?: string[]
  release_date?: string | null
  coming_soon?: boolean
  price?: string | null
  platforms?: string[]
  reviews?: string
  store_url?: string
  assets?: AureliaAssets
  extended?: {
    categories?: string[]
    genres?: string[]
    tags?: string[]
    metacritic?: number | null
    website?: string | null
    requirements?: {
      minimum?: string[]
      recommended?: string[]
    }
  }
}

export interface AureliaDryRunResponse {
  app_id: number
  platform?: string
  download_size: number
  disk_size: number
  depot_count?: number
}

export interface AureliaConfigShowResponse {
  steam_library_path: string
}

/** Result of `aurelia libraries --json`. */
export interface AureliaLibrariesResponse {
  libraries: Array<{ path: string; free_bytes: number | null }>
}

interface AureliaLaunchOption {
  id: string | number
  description?: string
  executable?: string
  arguments?: string
  working_dir?: string
  oslist?: string
  osarch?: string
  type?: string
}

export interface AureliaLaunchOptionsResponse {
  app_id: number
  launch_options: AureliaLaunchOption[]
}

/** One entry from `aurelia achievements <id> --json`. */
interface AureliaAchievement {
  achievement_id: string
  achievement_key: string
  name: string
  description: string
  visible?: boolean
  image_url_unlocked?: string
  image_url_locked?: string
  rarity?: number
  unlocked?: boolean
  unlock_time?: number | null
  date_unlocked?: string | null
}

export interface AureliaAchievementsResponse {
  app_id: number
  unlocked?: number
  total?: number
  achievements: AureliaAchievement[]
}

/** One save that diverged between Steam Cloud and disk (`cloud sync` JSON). */
export interface AureliaCloudConflict {
  filename: string
  local_path: string
  local_hash: string
  local_size: number
  local_timestamp: number
  cloud_hash: string
  cloud_size: number
  cloud_timestamp: number
}

/** Result of `aurelia cloud sync <id> --json`. */
export interface AureliaCloudSyncResponse {
  app_id: number
  direction: 'up' | 'down' | 'both'
  remote_root?: string
  status: 'ok' | 'conflicts'
  downloaded?: string[]
  uploaded?: string[]
  conflicts?: AureliaCloudConflict[]
}

export interface AureliaAccount {
  // FIXME: Aurelia prints the 64-bit SteamID as a JSON number;
  steam_id: string | number
  account_name: string
  country?: string
  email?: string
  email_validated?: boolean
}
