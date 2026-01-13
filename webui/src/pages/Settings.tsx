import { useEffect, useMemo, useState } from "react"

import { api } from "@/lib/api"
import type {
  AccountTab,
  AccountUrlItem,
  BrowserInfo,
  MixUrlItem,
  SettingsData,
  TikTokBrowserInfo,
  UIConfig,
  UpdateInfo,
} from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

const STORAGE_NONE = "__none__"

function cookieToString(value: SettingsData["cookie"]): string {
  if (typeof value === "string") return value
  if (!value || typeof value !== "object") return ""
  return Object.entries(value)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")
}

function createAccountRow(): AccountUrlItem {
  return { enable: true, mark: "", url: "", tab: "post", earliest: "", latest: "" }
}

function createMixRow(): MixUrlItem {
  return { enable: true, mark: "", url: "" }
}

function defaultBrowserInfo(): BrowserInfo {
  return {
    "User-Agent": "",
    pc_libra_divert: "",
    browser_language: "",
    browser_platform: "",
    browser_name: "",
    browser_version: "",
    engine_name: "",
    engine_version: "",
    os_name: "",
    os_version: "",
    webid: "",
  }
}

function defaultTikTokBrowserInfo(): TikTokBrowserInfo {
  return {
    "User-Agent": "",
    app_language: "",
    browser_language: "",
    browser_name: "",
    browser_platform: "",
    browser_version: "",
    language: "",
    os: "",
    priority_region: "",
    region: "",
    tz_name: "",
    webcast_language: "",
    device_id: "",
  }
}

function AccountListEditor(props: {
  value: AccountUrlItem[]
  onChange: (value: AccountUrlItem[]) => void
}) {
  const rows = props.value ?? []
  const updateRow = (index: number, patch: Partial<AccountUrlItem>) => {
    props.onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  const removeRow = (index: number) => props.onChange(rows.filter((_, i) => i !== index))
  const addRow = () => props.onChange([...rows, createAccountRow()])

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">启用</TableHead>
            <TableHead className="w-28">类型</TableHead>
            <TableHead className="w-32">最早</TableHead>
            <TableHead className="w-32">最晚</TableHead>
            <TableHead className="w-40">标识</TableHead>
            <TableHead>账号链接</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${index}-${row.url}`}>
              <TableCell>
                <Checkbox
                  checked={row.enable}
                  onCheckedChange={(v) => updateRow(index, { enable: Boolean(v) })}
                />
              </TableCell>
              <TableCell>
                <Select
                  value={row.tab}
                  onValueChange={(v) => updateRow(index, { tab: v as AccountTab })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">发布</SelectItem>
                    <SelectItem value="favorite">喜欢</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input
                  value={String(row.earliest ?? "")}
                  onChange={(e) => updateRow(index, { earliest: e.target.value })}
                  placeholder="YYYY/MM/DD 或 天数"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={String(row.latest ?? "")}
                  onChange={(e) => updateRow(index, { latest: e.target.value })}
                  placeholder="YYYY/MM/DD 或 天数"
                />
              </TableCell>
              <TableCell>
                <Input value={row.mark} onChange={(e) => updateRow(index, { mark: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input value={row.url} onChange={(e) => updateRow(index, { url: e.target.value })} />
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => removeRow(index)}>
                  删除
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-sm text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button variant="outline" onClick={addRow}>
          添加账号
        </Button>
      </div>
    </div>
  )
}

function MixListEditor(props: { value: MixUrlItem[]; onChange: (value: MixUrlItem[]) => void }) {
  const rows = props.value ?? []
  const updateRow = (index: number, patch: Partial<MixUrlItem>) => {
    props.onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  const removeRow = (index: number) => props.onChange(rows.filter((_, i) => i !== index))
  const addRow = () => props.onChange([...rows, createMixRow()])

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">启用</TableHead>
            <TableHead className="w-40">标识</TableHead>
            <TableHead>合集链接</TableHead>
            <TableHead className="w-20">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${index}-${row.url}`}>
              <TableCell>
                <Checkbox
                  checked={row.enable}
                  onCheckedChange={(v) => updateRow(index, { enable: Boolean(v) })}
                />
              </TableCell>
              <TableCell>
                <Input value={row.mark} onChange={(e) => updateRow(index, { mark: e.target.value })} />
              </TableCell>
              <TableCell>
                <Input value={row.url} onChange={(e) => updateRow(index, { url: e.target.value })} />
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => removeRow(index)}>
                  删除
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <div className="flex justify-end">
        <Button variant="outline" onClick={addRow}>
          添加合集
        </Button>
      </div>
    </div>
  )
}

function BrowserInfoEditor(props: { value: BrowserInfo; onChange: (value: BrowserInfo) => void }) {
  const v = props.value
  const set = (key: keyof BrowserInfo, val: string) => props.onChange({ ...v, [key]: val })
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>User-Agent（浏览器标识）</Label>
        <Textarea value={v["User-Agent"]} onChange={(e) => set("User-Agent", e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>平台</Label>
        <Input value={v.pc_libra_divert} onChange={(e) => set("pc_libra_divert", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>语言</Label>
        <Input value={v.browser_language} onChange={(e) => set("browser_language", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>浏览器平台</Label>
        <Input value={v.browser_platform} onChange={(e) => set("browser_platform", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>浏览器名称</Label>
        <Input value={v.browser_name} onChange={(e) => set("browser_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>浏览器版本</Label>
        <Input value={v.browser_version} onChange={(e) => set("browser_version", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>引擎名称</Label>
        <Input value={v.engine_name} onChange={(e) => set("engine_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>引擎版本</Label>
        <Input value={v.engine_version} onChange={(e) => set("engine_version", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>系统名称</Label>
        <Input value={v.os_name} onChange={(e) => set("os_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>系统版本</Label>
        <Input value={v.os_version} onChange={(e) => set("os_version", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>WebID（webid，可选）</Label>
        <Input value={v.webid} onChange={(e) => set("webid", e.target.value)} />
      </div>
    </div>
  )
}

function TikTokBrowserInfoEditor(props: {
  value: TikTokBrowserInfo
  onChange: (value: TikTokBrowserInfo) => void
}) {
  const v = props.value
  const set = (key: keyof TikTokBrowserInfo, val: string) => props.onChange({ ...v, [key]: val })
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>User-Agent（浏览器标识）</Label>
        <Textarea value={v["User-Agent"]} onChange={(e) => set("User-Agent", e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>应用语言（app_language）</Label>
        <Input value={v.app_language} onChange={(e) => set("app_language", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>浏览器语言（browser_language）</Label>
        <Input value={v.browser_language} onChange={(e) => set("browser_language", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>浏览器名称（browser_name）</Label>
        <Input value={v.browser_name} onChange={(e) => set("browser_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>浏览器平台（browser_platform）</Label>
        <Input value={v.browser_platform} onChange={(e) => set("browser_platform", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>浏览器版本（browser_version）</Label>
        <Input value={v.browser_version} onChange={(e) => set("browser_version", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>语言（language）</Label>
        <Input value={v.language} onChange={(e) => set("language", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>系统（os）</Label>
        <Input value={v.os} onChange={(e) => set("os", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>优先地区（priority_region）</Label>
        <Input value={v.priority_region} onChange={(e) => set("priority_region", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>地区（region）</Label>
        <Input value={v.region} onChange={(e) => set("region", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>时区（tz_name）</Label>
        <Input value={v.tz_name} onChange={(e) => set("tz_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>直播语言（webcast_language）</Label>
        <Input value={v.webcast_language} onChange={(e) => set("webcast_language", e.target.value)} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>设备 ID（device_id）</Label>
        <Input value={v.device_id} onChange={(e) => set("device_id", e.target.value)} />
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [uiConfig, setUiConfig] = useState<UIConfig | null>(null)
  const [cookie, setCookie] = useState("")
  const [cookieTikTok, setCookieTikTok] = useState("")
  const [cookieAction, setCookieAction] = useState<string | null>(null)
  const [cookieBrowsers, setCookieBrowsers] = useState<{ name: string; support: string }[] | null>(null)
  const [cookieBrowsersLoading, setCookieBrowsersLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteIds, setDeleteIds] = useState("")
  const [deletingRecords, setDeletingRecords] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [clipboardRunning, setClipboardRunning] = useState(false)
  const [clipboardLoading, setClipboardLoading] = useState(false)

  const storageOptions = useMemo(
    () => [
      { value: STORAGE_NONE, label: "不保存数据" },
      { value: "csv", label: "CSV" },
      { value: "xlsx", label: "Excel (XLSX)" },
      { value: "sql", label: "SQLite (sql)" },
    ],
    []
  )

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [s, c, monitor] = await Promise.all([
          api.getSettings(),
          api.getUIConfig(),
          api.getClipboardMonitorStatus(),
        ])
        if (!mounted) return
        setSettings(s)
        setUiConfig(c)
        setCookie(cookieToString(s.cookie))
        setCookieTikTok(cookieToString(s.cookie_tiktok))
        setClipboardRunning(Boolean(monitor.running))
      } catch (e) {
        if (!mounted) return
        setError(String(e))
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const update = (patch: Partial<SettingsData>) => {
    if (!settings) return
    setSettings({ ...settings, ...patch })
  }

  const canSave = Boolean(settings) && Boolean(uiConfig) && !saving

  const saveAll = async () => {
    if (!settings || !uiConfig) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api.updateUIConfig({ record: uiConfig.record, logger: uiConfig.logger })
      const next = await api.saveSettings({ ...settings, cookie, cookie_tiktok: cookieTikTok })
      setSettings(next)
      setCookie(cookieToString(next.cookie))
      setCookieTikTok(cookieToString(next.cookie_tiktok))
      setMessage("已保存")
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  if (!settings || !uiConfig) {
    if (error) return <div className="text-sm text-destructive">{error}</div>
    return <div className="text-sm text-muted-foreground">加载中...</div>
  }

  const importCookie = async (platform: "douyin" | "tiktok", source: "clipboard" | "browser") => {
    setCookieAction(`${platform}.${source}`)
    setMessage(null)
    setError(null)
    try {
      if (source === "clipboard") {
        const result = await api.importCookieFromClipboard(platform)
        if (platform === "douyin") setCookie(result.cookie)
        else setCookieTikTok(result.cookie)
        setMessage(
          `已从剪贴板导入并写入${platform === "douyin" ? "抖音" : "TikTok"} Cookie${result.logged_in ? "（已检测到登录）" : "（未检测到登录）"}`
        )
        return
      }

      const result = await api.importCookieFromBrowser({ platform })
      if (platform === "douyin") setCookie(result.cookie)
      else setCookieTikTok(result.cookie)
      const browserTip = result.browser ? `（${result.browser}）` : ""
      setMessage(
        `已从浏览器${browserTip}导入并写入${platform === "douyin" ? "抖音" : "TikTok"} Cookie${
          result.logged_in ? "（已检测到登录）" : "（未检测到登录）"
        }`
      )
    } catch (e) {
      setError(String(e))
    } finally {
      setCookieAction(null)
    }
  }

  const toggleCookieBrowsers = async () => {
    if (cookieBrowsers) {
      setCookieBrowsers(null)
      return
    }
    setCookieBrowsersLoading(true)
    setError(null)
    try {
      const data = await api.listCookieBrowsers()
      setCookieBrowsers(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setCookieBrowsersLoading(false)
    }
  }

  const deleteRecords = async (ids: string) => {
    const value = ids.trim()
    if (!value) return
    if (!window.confirm("确认要删除下载记录吗？此操作不可撤销。")) return
    setDeletingRecords(true)
    setMessage(null)
    setError(null)
    try {
      await api.deleteDownloadRecords(value)
      setMessage(value.toUpperCase() === "ALL" ? "已清空下载记录" : "已删除下载记录")
      if (value.toUpperCase() !== "ALL") setDeleteIds("")
    } catch (e) {
      setError(String(e))
    } finally {
      setDeletingRecords(false)
    }
  }

  const checkUpdate = async () => {
    setCheckingUpdate(true)
    setError(null)
    try {
      const info = await api.checkUpdate()
      setUpdateInfo(info)
    } catch (e) {
      setError(String(e))
    } finally {
      setCheckingUpdate(false)
    }
  }

  const toggleClipboardMonitor = async (enable: boolean) => {
    if (clipboardLoading) return
    const previous = clipboardRunning
    setClipboardRunning(enable)
    setClipboardLoading(true)
    setError(null)
    try {
      const res = enable ? await api.startClipboardMonitor() : await api.stopClipboardMonitor()
      setClipboardRunning(Boolean(res.running))
      setMessage(enable ? "已开启剪贴板监听下载" : "已关闭剪贴板监听下载")
    } catch (e) {
      setClipboardRunning(previous)
      setError(String(e))
    } finally {
      setClipboardLoading(false)
    }
  }

  const owner =
    settings.owner_url && typeof settings.owner_url === "object"
      ? settings.owner_url
      : { mark: "", url: "", uid: "", sec_uid: "", nickname: "" }

  const browserInfo =
    settings.browser_info && typeof settings.browser_info === "object"
      ? settings.browser_info
      : defaultBrowserInfo()

  const browserInfoTikTok =
    settings.browser_info_tiktok && typeof settings.browser_info_tiktok === "object"
      ? settings.browser_info_tiktok
      : defaultTikTokBrowserInfo()

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">设置</div>
          <div className="text-sm text-muted-foreground">仅本机生效，保存后立即应用。</div>
        </div>
        <Button onClick={saveAll} disabled={!canSave}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>

      {message ? <div className="text-sm text-muted-foreground">{message}</div> : null}
      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">通用</TabsTrigger>
          <TabsTrigger value="accounts">账号</TabsTrigger>
          <TabsTrigger value="mix">合集</TabsTrigger>
          <TabsTrigger value="network">Cookie / 代理</TabsTrigger>
          <TabsTrigger value="advanced">高级</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>程序</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={uiConfig.record} onCheckedChange={(v) => setUiConfig({ ...uiConfig, record: Boolean(v) })} />
                  <Label>作品下载记录（跳过已下载）</Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={uiConfig.logger} onCheckedChange={(v) => setUiConfig({ ...uiConfig, logger: Boolean(v) })} />
                  <Label>运行日志记录</Label>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>下载根目录</Label>
                  <Input value={settings.root ?? ""} onChange={(e) => update({ root: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>下载文件夹名</Label>
                  <Input value={settings.folder_name ?? ""} onChange={(e) => update({ folder_name: e.target.value })} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={settings.folder_mode} onCheckedChange={(v) => update({ folder_mode: Boolean(v) })} />
                  <Label>按作品类型分文件夹</Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={settings.music} onCheckedChange={(v) => update({ music: Boolean(v) })} />
                  <Label>仅下载音乐（如适用）</Label>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>存储格式（采集数据）</Label>
                  <Select
                    value={settings.storage_format || STORAGE_NONE}
                    onValueChange={(v) => update({ storage_format: v === STORAGE_NONE ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择格式" />
                    </SelectTrigger>
                    <SelectContent>
                      {storageOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>直播画质偏好</Label>
                  <Input
                    value={settings.live_qualities ?? ""}
                    onChange={(e) => update({ live_qualities: e.target.value })}
                    placeholder="如：origin 或 1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>命名与输出</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>命名格式</Label>
                  <Input value={settings.name_format ?? ""} onChange={(e) => update({ name_format: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>描述长度</Label>
                  <Input
                    type="number"
                    value={settings.desc_length}
                    onChange={(e) => update({ desc_length: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>文件名长度</Label>
                  <Input
                    type="number"
                    value={settings.name_length}
                    onChange={(e) => update({ name_length: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>日期格式</Label>
                  <Input value={settings.date_format ?? ""} onChange={(e) => update({ date_format: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>分隔符</Label>
                  <Input value={settings.split ?? ""} onChange={(e) => update({ split: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>清理长度</Label>
                  <Input
                    type="number"
                    value={settings.truncate}
                    onChange={(e) => update({ truncate: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox checked={settings.dynamic_cover} onCheckedChange={(v) => update({ dynamic_cover: Boolean(v) })} />
                  <Label>下载动态图封面</Label>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox checked={settings.static_cover} onCheckedChange={(v) => update({ static_cover: Boolean(v) })} />
                  <Label>下载静态封面</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>下载策略</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <Checkbox checked={settings.download} onCheckedChange={(v) => update({ download: Boolean(v) })} />
                <Label>允许下载（关闭后仅采集不下载）</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>单文件最大大小</Label>
                  <Input
                    type="number"
                    value={settings.max_size}
                    onChange={(e) => update({ max_size: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>分片大小（字节）</Label>
                  <Input
                    type="number"
                    value={settings.chunk}
                    onChange={(e) => update({ chunk: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>超时（秒）</Label>
                  <Input
                    type="number"
                    value={settings.timeout}
                    onChange={(e) => update({ timeout: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大重试次数</Label>
                  <Input
                    type="number"
                    value={settings.max_retry}
                    onChange={(e) => update({ max_retry: Number(e.target.value || 0) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大页数</Label>
                  <Input
                    type="number"
                    value={settings.max_pages}
                    onChange={(e) => update({ max_pages: Number(e.target.value || 0) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>下载记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">清空全部下载记录</div>
                  <div className="text-xs text-muted-foreground">用于重新下载；不会删除本地文件。</div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingRecords || saving}
                  onClick={() => void deleteRecords("ALL")}
                >
                  清空
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>删除指定作品 ID</Label>
                <Textarea
                  value={deleteIds}
                  onChange={(e) => setDeleteIds(e.target.value)}
                  rows={2}
                  placeholder="粘贴作品 ID（可多个，空格/换行分隔）"
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={deletingRecords || saving || !deleteIds.trim()}
                    onClick={() => void deleteRecords(deleteIds)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>检查更新</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">软件版本</div>
                  <div className="text-xs text-muted-foreground">从发布页获取最新版本信息。</div>
                </div>
                <Button
                  variant="outline"
                  disabled={checkingUpdate || saving}
                  onClick={() => void checkUpdate()}
                >
                  {checkingUpdate ? "检查中..." : "检查更新"}
                </Button>
              </div>

              {updateInfo ? (
                <div className="space-y-2 rounded-md border bg-card/60 p-4 text-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>当前版本：{updateInfo.current_version}</div>
                    <div>最新版本：{updateInfo.latest_version}</div>
                  </div>
                  <div className={updateInfo.update_available ? "text-primary font-medium" : "text-muted-foreground"}>
                    {updateInfo.update_available ? "发现新版本" : "已是最新版本"}
                  </div>
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!updateInfo.releases_url}
                      onClick={() => window.open(updateInfo.releases_url, "_blank")}
                    >
                      打开发布页
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>平台开关</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2 pt-1">
                <Checkbox checked={settings.douyin_platform} onCheckedChange={(v) => update({ douyin_platform: Boolean(v) })} />
                <Label>启用抖音</Label>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox checked={settings.tiktok_platform} onCheckedChange={(v) => update({ tiktok_platform: Boolean(v) })} />
                <Label>启用 TikTok</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>当前账号（用于“收藏”下载）</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>主页链接</Label>
                <Input
                  value={owner.url ?? ""}
                  onChange={(e) => update({ owner_url: { ...owner, url: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>标识</Label>
                <Input
                  value={owner.mark ?? ""}
                  onChange={(e) => update({ owner_url: { ...owner, mark: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>uid</Label>
                <Input
                  value={owner.uid ?? ""}
                  onChange={(e) => update({ owner_url: { ...owner, uid: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>sec_uid</Label>
                <Input
                  value={owner.sec_uid ?? ""}
                  onChange={(e) => update({ owner_url: { ...owner, sec_uid: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>昵称</Label>
                <Input
                  value={owner.nickname ?? ""}
                  onChange={(e) => update({ owner_url: { ...owner, nickname: e.target.value } })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>账号列表（抖音）</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountListEditor value={settings.accounts_urls} onChange={(v) => update({ accounts_urls: v })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>账号列表（TikTok）</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountListEditor
                value={settings.accounts_urls_tiktok}
                onChange={(v) => update({ accounts_urls_tiktok: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mix" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>合集列表（抖音）</CardTitle>
            </CardHeader>
            <CardContent>
              <MixListEditor value={settings.mix_urls} onChange={(v) => update({ mix_urls: v })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>合集列表（TikTok）</CardTitle>
            </CardHeader>
            <CardContent>
              <MixListEditor value={settings.mix_urls_tiktok} onChange={(v) => update({ mix_urls_tiktok: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Cookie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>抖音 Cookie</Label>
                <Textarea value={cookie} onChange={(e) => setCookie(e.target.value)} rows={6} placeholder="粘贴 Cookie 字符串" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(cookieAction) || saving}
                    onClick={() => void importCookie("douyin", "clipboard")}
                  >
                    从剪贴板导入
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(cookieAction) || saving}
                    onClick={() => void importCookie("douyin", "browser")}
                  >
                    从浏览器导入
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>TikTok Cookie</Label>
                <Textarea value={cookieTikTok} onChange={(e) => setCookieTikTok(e.target.value)} rows={6} placeholder="粘贴 Cookie 字符串" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(cookieAction) || saving}
                    onClick={() => void importCookie("tiktok", "clipboard")}
                  >
                    从剪贴板导入
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(cookieAction) || saving}
                    onClick={() => void importCookie("tiktok", "browser")}
                  >
                    从浏览器导入
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Windows 读取 Chromium/Chrome/Edge Cookie 可能需要以管理员身份运行程序。
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={cookieBrowsersLoading || saving}
                    onClick={() => void toggleCookieBrowsers()}
                  >
                    {cookieBrowsersLoading ? "加载中..." : cookieBrowsers ? "收起支持的浏览器" : "查看支持的浏览器"}
                  </Button>
                </div>
                {cookieBrowsers ? (
                  <div className="text-xs text-muted-foreground">
                    {cookieBrowsers.map((b) => b.name).join(" / ")}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>代理</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>抖音代理</Label>
                <Input value={settings.proxy ?? ""} onChange={(e) => update({ proxy: e.target.value })} placeholder="http://127.0.0.1:7890" />
              </div>
                <div className="space-y-2">
                  <Label>TikTok 代理</Label>
                  <Input
                    value={settings.proxy_tiktok ?? ""}
                  onChange={(e) => update({ proxy_tiktok: e.target.value })}
                  placeholder="socks5://127.0.0.1:7890"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>TikTok ttwid（twc_tiktok，可选）</Label>
                <Input value={settings.twc_tiktok ?? ""} onChange={(e) => update({ twc_tiktok: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>运行与工具</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 rounded-md border p-4 md:col-span-2">
                <Checkbox
                  id="clipboard-monitor"
                  checked={clipboardRunning}
                  disabled={clipboardLoading || saving}
                  onCheckedChange={(v) => void toggleClipboardMonitor(Boolean(v))}
                />
                <div className="space-y-1">
                  <Label htmlFor="clipboard-monitor">剪贴板监听下载</Label>
                  <div className="text-xs text-muted-foreground">
                    {clipboardLoading ? "处理中..." : clipboardRunning ? "运行中：自动识别剪贴板链接并下载" : "未运行：勾选以开启后台监听"}
                  </div>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>自动选择序列（run_command）</Label>
                <Input value={settings.run_command ?? ""} onChange={(e) => update({ run_command: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>ffmpeg 路径</Label>
                <Input value={settings.ffmpeg ?? ""} onChange={(e) => update({ ffmpeg: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>TikTok 主页参数（owner_url_tiktok，保留）</Label>
                <Input value={settings.owner_url_tiktok ? "已设置" : "null"} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>浏览器参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm text-muted-foreground">仅在需要时修改，错误参数可能导致请求失败。</div>
              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">抖音浏览器参数</summary>
                <div className="pt-4">
                  <BrowserInfoEditor
                    value={browserInfo}
                    onChange={(v) => update({ browser_info: v })}
                  />
                </div>
              </details>
              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">TikTok 浏览器参数</summary>
                <div className="pt-4">
                  <TikTokBrowserInfoEditor
                    value={browserInfoTikTok}
                    onChange={(v) => update({ browser_info_tiktok: v })}
                  />
                </div>
              </details>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>
    </div>
  )
}
