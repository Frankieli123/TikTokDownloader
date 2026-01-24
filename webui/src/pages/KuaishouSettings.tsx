import { useEffect, useMemo, useState } from "react"

import { api } from "@/lib/api"
import { notify } from "@/lib/notify"
import type { KuaishouSettingsResponse } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type SettingsObject = Record<string, any>

const COVER_NONE = "__none__"

function toJsonText(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

export function KuaishouSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<KuaishouSettingsResponse | null>(null)
  const [settings, setSettings] = useState<SettingsObject>({})
  const [recordEnabled, setRecordEnabled] = useState(false)
  const [mappingText, setMappingText] = useState("{}")
  const [deleteIds, setDeleteIds] = useState("")
  const [cookieAction, setCookieAction] = useState<string | null>(null)

  const coverValue = useMemo(() => String(settings.cover || "") || COVER_NONE, [settings.cover])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getKuaishouSettings()
      setResp(data)
      setSettings(data.settings || {})
      setRecordEnabled(Boolean(data.record))
      setMappingText(toJsonText((data.settings as any)?.mapping_data))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const update = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      let mapping_data: any = undefined
      try {
        mapping_data = JSON.parse(mappingText || "{}")
      } catch {
        throw new Error("mapping_data 不是有效的 JSON")
      }

      const next = await api.saveKuaishouSettings({
        data: { ...settings, mapping_data },
        record: recordEnabled,
      })
      setResp(next)
      setSettings(next.settings || {})
      setRecordEnabled(Boolean(next.record))
      setMappingText(toJsonText((next.settings as any)?.mapping_data))
      notify.success("已保存")
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const importCookie = async (source: "clipboard" | "browser") => {
    setCookieAction(source)
    setError(null)
    try {
      const result =
        source === "clipboard" ? await api.importKuaishouCookieFromClipboard() : await api.importKuaishouCookieFromBrowser({})
      update("cookie", result.cookie)
      notify.success("Cookie 已导入")
    } catch (e) {
      setError(String(e))
    } finally {
      setCookieAction(null)
    }
  }

  const deleteRecords = async () => {
    const ids = deleteIds.trim()
    if (!ids) return
    try {
      await api.deleteKuaishouRecords(ids)
      notify.success("已删除下载记录")
    } catch (e) {
      setError(String(e))
    }
  }

  const clearRecords = async () => {
    try {
      await api.clearKuaishouRecords()
      notify.success("已清空下载记录")
    } catch (e) {
      setError(String(e))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">加载中...</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <Tabs defaultValue="general">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="network">Cookie / 代理</TabsTrigger>
            <TabsTrigger value="advanced">高级</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={saving}>
              刷新
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>

        {resp ? <div className="text-xs text-muted-foreground">下载记录：{recordEnabled ? "启用" : "禁用"}</div> : null}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>命名与输出</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>下载根目录</Label>
                  <Input
                    value={String(settings.work_path || "")}
                    onChange={(e) => update("work_path", e.target.value)}
                    placeholder="留空则使用 Volume/Kuaishou"
                  />
                </div>
                <div className="space-y-2">
                  <Label>下载文件夹名</Label>
                  <Input
                    value={String(settings.folder_name || "")}
                    onChange={(e) => update("folder_name", e.target.value)}
                    placeholder="Download"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>文件命名格式</Label>
                  <Input
                    value={String(settings.name_format || "")}
                    onChange={(e) => update("name_format", e.target.value)}
                    placeholder="发布日期 作者昵称 作品描述"
                  />
                </div>
                <div className="space-y-2">
                  <Label>文件名长度限制</Label>
                  <Input
                    type="number"
                    value={Number(settings.name_length ?? 128)}
                    onChange={(e) => update("name_length", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={Boolean(settings.folder_mode)} onCheckedChange={(v) => update("folder_mode", Boolean(v))} />
                  <Label>作品单独文件夹</Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={Boolean(settings.author_archive)} onCheckedChange={(v) => update("author_archive", Boolean(v))} />
                  <Label>作者归档（别名+重命名）</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>下载内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={Boolean(settings.data_record)} onCheckedChange={(v) => update("data_record", Boolean(v))} />
                  <Label>保存作品数据（DetailData.db）</Label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox checked={Boolean(settings.music)} onCheckedChange={(v) => update("music", Boolean(v))} />
                  <Label>下载音乐</Label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>封面格式</Label>
                  <Select value={coverValue} onValueChange={(v) => update("cover", v === COVER_NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择格式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={COVER_NONE}>不下载</SelectItem>
                      <SelectItem value="JPEG">JPEG</SelectItem>
                      <SelectItem value="WEBP">WEBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>下载策略</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>最大并发下载数</Label>
                  <Input
                    type="number"
                    value={Number(settings.max_workers ?? 4)}
                    onChange={(e) => update("max_workers", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>分块大小（字节）</Label>
                  <Input type="number" value={Number(settings.chunk ?? 2097152)} onChange={(e) => update("chunk", Number(e.target.value))} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>请求超时（秒）</Label>
                  <Input
                    type="number"
                    value={Number(settings.timeout ?? 10)}
                    onChange={(e) => update("timeout", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>最大重试次数</Label>
                  <Input
                    type="number"
                    value={Number(settings.max_retry ?? 5)}
                    onChange={(e) => update("max_retry", Number(e.target.value))}
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
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">作品下载记录（跳过已下载）</div>
                  <div className="text-xs text-muted-foreground">对应 Volume/Kuaishou/Kuaishou.db</div>
                </div>
                <Checkbox checked={recordEnabled} onCheckedChange={(v) => setRecordEnabled(Boolean(v))} />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">清空全部下载记录</div>
                  <div className="text-xs text-muted-foreground">用于重新下载；不会删除本地文件。</div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => void clearRecords()} disabled={saving}>
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
                  <Button variant="outline" size="sm" disabled={saving || !deleteIds.trim()} onClick={() => void deleteRecords()}>
                    删除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Cookie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={String(settings.cookie || "")} onChange={(e) => update("cookie", e.target.value)} rows={4} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={Boolean(cookieAction) || saving} onClick={() => void importCookie("clipboard")}>
                  {cookieAction === "clipboard" ? "导入中..." : "从剪贴板导入"}
                </Button>
                <Button variant="outline" size="sm" disabled={Boolean(cookieAction) || saving} onClick={() => void importCookie("browser")}>
                  {cookieAction === "browser" ? "导入中..." : "从浏览器导入"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>代理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>代理地址</Label>
              <Input value={String(settings.proxy || "")} onChange={(e) => update("proxy", e.target.value)} placeholder="http://127.0.0.1:7890" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>请求参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>User-Agent（浏览器标识）</Label>
              <Input value={String(settings.user_agent || "")} onChange={(e) => update("user_agent", e.target.value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>作者别名映射</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>mapping_data（JSON）</Label>
              <Textarea value={mappingText} onChange={(e) => setMappingText(e.target.value)} rows={8} />
              <div className="text-xs text-muted-foreground">保存时会校验 JSON 格式；仅在开启“作者归档”时生效。</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
