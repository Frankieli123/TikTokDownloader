export type TaskStatus = "queued" | "running" | "success" | "error" | "cancelled"

export interface UITask {
  id: string
  type: string
  title: string
  status: TaskStatus | string
  created_at: number
  started_at: number | null
  finished_at: number | null
  error: string | null
  meta: Record<string, unknown>
}

export interface AppInfo {
  name: string
  version: string
  disclaimer_accepted: boolean
  disclaimer_text: string
  record: boolean
  logger: boolean
}

export interface UIConfig {
  record: boolean
  logger: boolean
  disclaimer_accepted: boolean
}

export interface UpdateInfo {
  current_version: string
  latest_version: string
  update_available: boolean
  releases_url: string
  latest_tag?: string
  release_notes?: string
}

export type AccountTab = "post" | "favorite"

export interface AccountUrlItem {
  mark: string
  url: string
  tab: AccountTab
  earliest: string | number
  latest: string | number
  enable: boolean
}

export interface MixUrlItem {
  mark: string
  url: string
  enable: boolean
}

export interface OwnerUrlItem {
  mark: string
  url: string
  uid: string
  sec_uid: string
  nickname: string
}

export interface BrowserInfo {
  "User-Agent": string
  pc_libra_divert: string
  browser_language: string
  browser_platform: string
  browser_name: string
  browser_version: string
  engine_name: string
  engine_version: string
  os_name: string
  os_version: string
  webid: string
}

export interface TikTokBrowserInfo {
  "User-Agent": string
  app_language: string
  browser_language: string
  browser_name: string
  browser_platform: string
  browser_version: string
  language: string
  os: string
  priority_region: string
  region: string
  tz_name: string
  webcast_language: string
  device_id: string
}

export interface SettingsData {
  accounts_urls: AccountUrlItem[]
  accounts_urls_tiktok: AccountUrlItem[]
  mix_urls: MixUrlItem[]
  mix_urls_tiktok: MixUrlItem[]
  owner_url: OwnerUrlItem
  owner_url_tiktok: unknown | null
  root: string
  folder_name: string
  name_format: string
  desc_length: number
  name_length: number
  date_format: string
  split: string
  folder_mode: boolean
  music: boolean
  truncate: number
  storage_format: string
  cookie: string | Record<string, string>
  cookie_tiktok: string | Record<string, string>
  dynamic_cover: boolean
  static_cover: boolean
  proxy: string
  proxy_tiktok: string
  twc_tiktok: string
  download: boolean
  max_size: number
  chunk: number
  timeout: number
  max_retry: number
  max_pages: number
  run_command: string
  ffmpeg: string
  live_qualities: string
  douyin_platform: boolean
  tiktok_platform: boolean
  browser_info: BrowserInfo
  browser_info_tiktok: TikTokBrowserInfo
}
