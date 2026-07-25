import { appFolder } from 'backend/constants/paths'
import { join } from 'path'

export type OrderMap = Record<string, Order>

export interface Order {
  amount_spent: number
  product: Product
  gamekey: string
  uid: string
  created: string
  missed_credit: null | string
  subproducts: Subproduct[]
  total_choices: number
  tpkd_dict: TpkdDict
  choices_remaining: number
  currency: string
  is_giftee: boolean
  claimed: boolean
  total: number
  path_ids: string[]
}

interface Product {
  category: string
  machine_name: string
  empty_tpkds: object
  post_purchase_text: string
  human_name: string
  partial_gift_enabled: boolean
}

export interface Subproduct {
  machine_name: string
  url: string
  downloads: Download[]
  library_family_name: string | null
  payee: Payee
  human_name: string
  custom_download_page_box_css: string | null
  custom_download_page_box_html: string
  icon: string | null
  display_item?: {
    'description-text': string
  }
}

interface Download {
  desktop_app_only: boolean
  machine_name: string
  download_struct: DownloadFile[]
  options_dict: object
  download_identifier: string
  platform: string
  download_version_number: number | null
}

interface DownloadFile {
  sha1?: string
  name: string
  url: {
    web: string
    bittorrent?: string
  }
  timestamp?: number
  human_size: string
  file_size: number
  small?: number
  md5?: string
  build_version?: string
}

interface Payee {
  human_name: string
  machine_name: string
}

interface TpkdDict {
  all_tpks: Tpk[]
}

interface Tpk {
  machine_name: string
  key_type: string
  visible: boolean
  steam_app_id?: number
  exclusive_countries: string[]
  gamekey: string
  instructions_html: string
  preinstruction_text: string
  redeemed_key_val: string
  keyindex: number
  show_custom_instructions_in_user_libraries: boolean
  expiry_date: string
  display_separately: boolean
  class: string
  num_days_until_expired: number
  is_gift: boolean
  expiration_date: string
  disallowed_countries: string[]
  key_type_human_name: string
  human_name: string
  auto_expand: boolean
  is_expired: boolean
  disclaimer: string
}

export const configPath = join(appFolder, 'humble_config', 'humble')
export const library = join(configPath, 'library.json')
