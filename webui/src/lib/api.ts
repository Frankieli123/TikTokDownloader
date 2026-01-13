import type { AppInfo, SettingsData, UIConfig, UITask, UpdateInfo } from "@/types"

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`${response.status} ${response.statusText} ${text}`.trim())
  }
  return (await response.json()) as T
}

export const api = {
  getAppInfo: async (): Promise<AppInfo> => {
    return requestJson<AppInfo>("/ui-api/app")
  },
  acceptDisclaimer: async (): Promise<void> => {
    await requestJson("/ui-api/disclaimer/accept", { method: "POST" })
  },
  getUIConfig: async (): Promise<UIConfig> => {
    return requestJson<UIConfig>("/ui-api/config")
  },
  updateUIConfig: async (data: Partial<Pick<UIConfig, "record" | "logger">>): Promise<UIConfig> => {
    return requestJson<UIConfig>("/ui-api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  listCookieBrowsers: async (): Promise<{ name: string; support: string }[]> => {
    const data = await requestJson<{ browsers: { name: string; support: string }[] }>("/ui-api/cookie/browsers")
    return data.browsers
  },
  importCookieFromClipboard: async (platform: "douyin" | "tiktok"): Promise<{
    platform: "douyin" | "tiktok"
    cookie: string
    logged_in: boolean
  }> => {
    return requestJson("/ui-api/cookie/import/clipboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    })
  },
  importCookieFromBrowser: async (data: {
    platform: "douyin" | "tiktok"
    browser?: string | null
  }): Promise<{
    platform: "douyin" | "tiktok"
    browser: string | null
    cookie: string
    logged_in: boolean
  }> => {
    return requestJson("/ui-api/cookie/import/browser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  listTasks: async (): Promise<UITask[]> => {
    const data = await requestJson<{ tasks: UITask[] }>("/ui-api/tasks")
    return data.tasks
  },
  getTask: async (taskId: string): Promise<UITask> => {
    return requestJson<UITask>(`/ui-api/tasks/${encodeURIComponent(taskId)}`)
  },
  listDouyinCollects: async (): Promise<{ id: string; name: string }[]> => {
    const data = await requestJson<{ collects: { id: string; name: string }[] }>(
      "/ui-api/douyin/collects"
    )
    return data.collects
  },
  listDouyinMixCollections: async (): Promise<{ id: string; title: string }[]> => {
    const data = await requestJson<{ mix_collections: { id: string; title: string }[] }>(
      "/ui-api/douyin/mix-collections"
    )
    return data.mix_collections
  },

  createCollectLiveTask: async (data: {
    platform: "douyin" | "tiktok"
    text: string
    download?: boolean
    quality?: string | null
    cookie?: string | null
    proxy?: string | null
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/collect/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createCollectCommentTask: async (data: {
    text: string
    pages?: number
    cursor?: number
    count?: number
    count_reply?: number
    reply?: boolean
    cookie?: string | null
    proxy?: string | null
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/collect/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createCollectUserDataTask: async (data: {
    text: string
    cookie?: string | null
    proxy?: string | null
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/collect/user-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createCollectHotTask: async (data?: { cookie?: string | null; proxy?: string | null }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/collect/hot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data ?? {}),
    })
  },
  createCollectSearchTask: async (data: {
    mode: "general" | "video" | "user" | "live"
    keyword: string
    pages?: number
    offset?: number
    count?: number
    sort_type?: number
    publish_time?: number
    duration?: number
    search_range?: number
    content_type?: number
    douyin_user_fans?: number
    douyin_user_type?: number
    cookie?: string | null
    proxy?: string | null
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/collect/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },

  createDownloadDetailTask: async (data: {
    platform: "douyin" | "tiktok"
    text: string
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/detail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createDownloadTikTokOriginalTask: async (data: { text: string; proxy?: string | null }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/tiktok_original", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createDownloadAccountTask: async (data: {
    platform: "douyin" | "tiktok"
    text: string
    tab: string
    earliest?: string | number | null
    latest?: string | number | null
    pages?: number | null
    mark?: string
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createDownloadMixTask: async (data: {
    platform: "douyin" | "tiktok"
    text: string
    mark?: string
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/mix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createDownloadCollectionTask: async (data?: { cookie?: string | null; proxy?: string | null }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data ?? {}),
    })
  },
  createDownloadCollectsTask: async (data: {
    items: { id: string; name: string }[]
    cookie?: string | null
    proxy?: string | null
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/collects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  createDownloadCollectionMusicTask: async (data?: {
    cookie?: string | null
    proxy?: string | null
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/collection_music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data ?? {}),
    })
  },
  createDownloadMixCollectionTask: async (data: {
    items: { id: string; title: string }[]
    mark?: string
    cookie?: string | null
    proxy?: string | null
  }): Promise<UITask> => {
    return requestJson<UITask>("/ui-api/tasks/download/mix_collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  getSettings: async (): Promise<SettingsData> => {
    return requestJson<SettingsData>("/settings")
  },
  saveSettings: async (data: SettingsData): Promise<SettingsData> => {
    return requestJson<SettingsData>("/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  },
  deleteDownloadRecords: async (ids: string): Promise<{ ok: boolean }> => {
    return requestJson<{ ok: boolean }>("/ui-api/recorder/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
  },
  checkUpdate: async (): Promise<UpdateInfo> => {
    return requestJson<UpdateInfo>("/ui-api/update/check")
  },
  getClipboardMonitorStatus: async (): Promise<{ running: boolean }> => {
    return requestJson<{ running: boolean }>("/ui-api/monitor/clipboard")
  },
  startClipboardMonitor: async (): Promise<{ running: boolean }> => {
    return requestJson<{ running: boolean }>("/ui-api/monitor/clipboard/start", { method: "POST" })
  },
  stopClipboardMonitor: async (): Promise<{ running: boolean }> => {
    return requestJson<{ running: boolean }>("/ui-api/monitor/clipboard/stop", { method: "POST" })
  },
}
