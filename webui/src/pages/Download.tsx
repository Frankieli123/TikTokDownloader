import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { KuaishouDownloadPage } from "./KuaishouDownload"
import { api } from "@/lib/api"
import { usePlatform } from "@/lib/platform"
import { DatePickerButton } from "@/components/DatePickerButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type ApiPlatform = "douyin" | "tiktok"
type DownloadTab = "detail" | "account" | "mix" | "favorites"

type DownloadPlatformState = {
  tab: DownloadTab

  detailText: string
  detailOriginal: boolean

  accountText: string
  accountTab: string
  accountEarliest: string
  accountLatest: string
  accountPages: string
  accountMark: string

  mixText: string
  mixMark: string

  selectedCollectIds: string[]
  selectedMixCollectionIds: string[]
  mixCollectionMark: string
}

function createDefaultPlatformState(): DownloadPlatformState {
  return {
    tab: "detail",
    detailText: "",
    detailOriginal: false,
    accountText: "",
    accountTab: "post",
    accountEarliest: "",
    accountLatest: "",
    accountPages: "",
    accountMark: "",
    mixText: "",
    mixMark: "",
    selectedCollectIds: [],
    selectedMixCollectionIds: [],
    mixCollectionMark: "",
  }
}

export function DownloadPage() {
  const navigate = useNavigate()
  const { platform } = usePlatform()

  const supportedPlatform = platform === "douyin" || platform === "tiktok"
  const currentPlatform: ApiPlatform = platform === "tiktok" ? "tiktok" : "douyin"
  const isTikTok = currentPlatform === "tiktok"

  const [platformState, setPlatformState] = useState<Record<ApiPlatform, DownloadPlatformState>>(() => ({
    douyin: createDefaultPlatformState(),
    tiktok: createDefaultPlatformState(),
  }))
  const state = platformState[currentPlatform]

  const updateState = (patch: Partial<DownloadPlatformState>) => {
    setPlatformState((prev) => ({
      ...prev,
      [currentPlatform]: { ...prev[currentPlatform], ...patch },
    }))
  }

  const [detailPending, setDetailPending] = useState(false)

  const [accountPending, setAccountPending] = useState(false)

  const [mixPending, setMixPending] = useState(false)

  const [favoritesMessage, setFavoritesMessage] = useState<string | null>(null)
  const [favoritesPending, setFavoritesPending] = useState(false)
  const [collectsLoading, setCollectsLoading] = useState(false)
  const [collects, setCollects] = useState<{ id: string; name: string }[]>([])
  const [mixCollectionsLoading, setMixCollectionsLoading] = useState(false)
  const [mixCollections, setMixCollections] = useState<{ id: string; title: string }[]>([])

  const goTask = (taskId: string) => navigate(`/tasks?task=${encodeURIComponent(taskId)}`)

  const loadCollects = async () => {
    if (isTikTok) return
    setCollectsLoading(true)
    setFavoritesMessage(null)
    try {
      const data = await api.listDouyinCollects()
      setCollects(data)
      updateState({ selectedCollectIds: [] })
    } catch (e) {
      setFavoritesMessage(String(e))
    } finally {
      setCollectsLoading(false)
    }
  }

  const loadMixCollections = async () => {
    if (isTikTok) return
    setMixCollectionsLoading(true)
    setFavoritesMessage(null)
    try {
      const data = await api.listDouyinMixCollections()
      setMixCollections(data)
      updateState({ selectedMixCollectionIds: [] })
    } catch (e) {
      setFavoritesMessage(String(e))
    } finally {
      setMixCollectionsLoading(false)
    }
  }

  if (platform === "kuaishou") {
    return <KuaishouDownloadPage />
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {!supportedPlatform ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            该平台暂未接入
          </CardContent>
        </Card>
      ) : null}

      {supportedPlatform ? (
      <Tabs value={state.tab} onValueChange={(v) => updateState({ tab: v as DownloadTab })} className="w-full">
        <TabsList>
          <TabsTrigger value="detail">链接作品</TabsTrigger>
          <TabsTrigger value="account">账号作品</TabsTrigger>
          <TabsTrigger value="mix">合集作品</TabsTrigger>
          {!isTikTok ? <TabsTrigger value="favorites">收藏</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="detail" className="mt-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {isTikTok ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="detailOriginal"
                    checked={state.detailOriginal}
                    onCheckedChange={(v) => updateState({ detailOriginal: v === true })}
                  />
                  <Label htmlFor="detailOriginal" className="text-sm font-normal">
                    原画
                  </Label>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>链接文本</Label>
                <Textarea
                  value={state.detailText}
                  onChange={(e) => updateState({ detailText: e.target.value })}
                  rows={8}
                  placeholder="粘贴多个分享链接或完整链接，空格/换行分隔"
                />
              </div>

              <div className="flex justify-start">
                <Button
                  disabled={detailPending || !state.detailText.trim()}
                  onClick={async () => {
                    setDetailPending(true)
                    try {
                      const task =
                        isTikTok && state.detailOriginal
                          ? await api.createDownloadTikTokOriginalTask({ text: state.detailText })
                          : await api.createDownloadDetailTask({ platform: currentPlatform, text: state.detailText })
                      goTask(task.id)
                    } finally {
                      setDetailPending(false)
                    }
                  }}
                >
                  开始下载
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select value={state.accountTab} onValueChange={(v) => updateState({ accountTab: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">发布</SelectItem>
                      <SelectItem value="favorite">喜欢</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {state.accountTab === "post" ? (
                  <>
                    <div className="space-y-2">
                      <Label>最早日期</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={state.accountEarliest}
                          onChange={(e) => updateState({ accountEarliest: e.target.value })}
                          placeholder="YYYY/MM/DD 或天数"
                        />
                        <DatePickerButton onSelect={(value) => updateState({ accountEarliest: value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>最晚日期</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={state.accountLatest}
                          onChange={(e) => updateState({ accountLatest: e.target.value })}
                          placeholder="YYYY/MM/DD 或天数"
                        />
                        <DatePickerButton onSelect={(value) => updateState({ accountLatest: value })} />
                      </div>
                    </div>
                  </>
                ) : null}

                {state.accountTab === "favorite" ? (
                  <div className="space-y-2">
                    <Label>页数</Label>
                    <Input
                      value={state.accountPages}
                      onChange={(e) => updateState({ accountPages: e.target.value })}
                      placeholder="留空表示自动"
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>标识</Label>
                  <Input
                    value={state.accountMark}
                    onChange={(e) => updateState({ accountMark: e.target.value })}
                    placeholder="可选"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>账号链接文本</Label>
                <Textarea
                  value={state.accountText}
                  onChange={(e) => updateState({ accountText: e.target.value })}
                  rows={8}
                  placeholder="粘贴多个账号主页链接，空格/换行分隔"
                />
              </div>

              <div className="flex justify-start">
                <Button
                  disabled={accountPending || !state.accountText.trim()}
                  onClick={async () => {
                    setAccountPending(true)
                    try {
                      const tab = state.accountTab === "favorite" ? "favorite" : "post"
                      const toStringOrNumber = (raw: string): string | number | null => {
                        const v = raw.trim()
                        if (!v) return null
                        if (/^\d+(?:\.\d+)?$/.test(v)) {
                          const n = Number(v)
                          return Number.isFinite(n) ? n : null
                        }
                        return v
                      }
                      const pagesRaw = tab === "favorite" ? Number(state.accountPages.trim()) : NaN
                      const pages = Number.isFinite(pagesRaw) && pagesRaw > 0 ? Math.floor(pagesRaw) : null
                      const task = await api.createDownloadAccountTask({
                        platform: currentPlatform,
                        text: state.accountText,
                        tab,
                        earliest: tab === "post" ? toStringOrNumber(state.accountEarliest) : null,
                        latest: tab === "post" ? toStringOrNumber(state.accountLatest) : null,
                        pages,
                        mark: state.accountMark,
                      })
                      goTask(task.id)
                    } finally {
                      setAccountPending(false)
                    }
                  }}
                >
                  开始下载
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isTikTok ? (
          <TabsContent value="favorites" className="mt-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                {favoritesMessage ? <div className="text-sm text-destructive">{favoritesMessage}</div> : null}

                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button
                      variant="outline"
                      disabled={favoritesPending}
                      onClick={async () => {
                        setFavoritesPending(true)
                        setFavoritesMessage(null)
                        try {
                          const task = await api.createDownloadCollectionTask()
                          goTask(task.id)
                        } catch (e) {
                          setFavoritesMessage(String(e))
                        } finally {
                          setFavoritesPending(false)
                        }
                      }}
                    >
                      下载收藏作品
                    </Button>
                    <Button
                      variant="outline"
                      disabled={favoritesPending}
                      onClick={async () => {
                        setFavoritesPending(true)
                        setFavoritesMessage(null)
                        try {
                          const task = await api.createDownloadCollectionMusicTask()
                          goTask(task.id)
                        } catch (e) {
                          setFavoritesMessage(String(e))
                        } finally {
                          setFavoritesPending(false)
                        }
                      }}
                    >
                      下载收藏音乐
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">收藏夹作品</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void loadCollects()}
                          disabled={collectsLoading || favoritesPending}
                        >
                          {collectsLoading ? "加载中..." : "加载列表"}
                        </Button>
                        {collects.length > 0 ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateState({ selectedCollectIds: collects.map((c) => c.id) })}
                              disabled={favoritesPending}
                            >
                              全选
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateState({ selectedCollectIds: [] })}
                              disabled={favoritesPending || state.selectedCollectIds.length === 0}
                            >
                              清空
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {collects.length > 0 ? (
                      <div className="space-y-3">
                        <ScrollArea className="h-56 rounded-md border p-4">
                          <div className="space-y-2">
                            {collects.map((c) => (
                              <div key={c.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`collect-${c.id}`}
                                  checked={state.selectedCollectIds.includes(c.id)}
                                  onCheckedChange={(v) => {
                                    const next =
                                      v === true
                                        ? [...state.selectedCollectIds, c.id]
                                        : state.selectedCollectIds.filter((id) => id !== c.id)
                                    updateState({ selectedCollectIds: next })
                                  }}
                                />
                                <Label htmlFor={`collect-${c.id}`} className="text-sm font-normal">
                                  {c.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        <div className="flex justify-start">
                          <Button
                            size="sm"
                            disabled={favoritesPending || state.selectedCollectIds.length === 0}
                            onClick={async () => {
                              setFavoritesPending(true)
                              setFavoritesMessage(null)
                              try {
                                const items = collects.filter((c) => state.selectedCollectIds.includes(c.id))
                                const task = await api.createDownloadCollectsTask({ items })
                                goTask(task.id)
                              } catch (e) {
                                setFavoritesMessage(String(e))
                              } finally {
                                setFavoritesPending(false)
                              }
                            }}
                          >
                            下载选中收藏夹
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium">收藏合集作品</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void loadMixCollections()}
                          disabled={mixCollectionsLoading || favoritesPending}
                        >
                          {mixCollectionsLoading ? "加载中..." : "加载列表"}
                        </Button>
                        {mixCollections.length > 0 ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateState({ selectedMixCollectionIds: mixCollections.map((c) => c.id) })
                              }
                              disabled={favoritesPending}
                            >
                              全选
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateState({ selectedMixCollectionIds: [] })}
                              disabled={favoritesPending || state.selectedMixCollectionIds.length === 0}
                            >
                              清空
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {mixCollections.length > 0 ? (
                      <div className="space-y-3">
                        <ScrollArea className="h-56 rounded-md border p-4">
                          <div className="space-y-2">
                            {mixCollections.map((c) => (
                              <div key={c.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`mix-collect-${c.id}`}
                                  checked={state.selectedMixCollectionIds.includes(c.id)}
                                  onCheckedChange={(v) => {
                                    const next =
                                      v === true
                                        ? [...state.selectedMixCollectionIds, c.id]
                                        : state.selectedMixCollectionIds.filter((id) => id !== c.id)
                                    updateState({ selectedMixCollectionIds: next })
                                  }}
                                />
                                <Label htmlFor={`mix-collect-${c.id}`} className="text-sm font-normal">
                                  {c.title}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div className="space-y-2">
                            <Label className="text-sm">标识</Label>
                            <Input
                              value={state.mixCollectionMark}
                              onChange={(e) => updateState({ mixCollectionMark: e.target.value })}
                              placeholder="可选"
                              className="w-64"
                            />
                          </div>
                          <Button
                            size="sm"
                            disabled={favoritesPending || state.selectedMixCollectionIds.length === 0}
                            onClick={async () => {
                              setFavoritesPending(true)
                              setFavoritesMessage(null)
                              try {
                                const items = mixCollections.filter((c) => state.selectedMixCollectionIds.includes(c.id))
                                const task = await api.createDownloadMixCollectionTask({
                                  items,
                                  mark: state.mixCollectionMark.trim() ? state.mixCollectionMark.trim() : undefined,
                                })
                                goTask(task.id)
                              } catch (e) {
                                setFavoritesMessage(String(e))
                              } finally {
                                setFavoritesPending(false)
                              }
                            }}
                          >
                            下载选中合集
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    需要登录抖音 Cookie，且设置里的 `owner_url` 必须指向当前账号主页。
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="mix" className="mt-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>标识</Label>
                  <Input
                    value={state.mixMark}
                    onChange={(e) => updateState({ mixMark: e.target.value })}
                    placeholder="可选"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>合集链接文本</Label>
                <Textarea
                  value={state.mixText}
                  onChange={(e) => updateState({ mixText: e.target.value })}
                  rows={8}
                  placeholder="粘贴多个合集链接，空格/换行分隔"
                />
              </div>

              <div className="flex justify-start">
                <Button
                  disabled={mixPending || !state.mixText.trim()}
                  onClick={async () => {
                    setMixPending(true)
                    try {
                      const task = await api.createDownloadMixTask({
                        platform: currentPlatform,
                        text: state.mixText,
                        mark: state.mixMark,
                      })
                      goTask(task.id)
                    } finally {
                      setMixPending(false)
                    }
                  }}
                >
                  开始下载
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      ) : null}

      {supportedPlatform ? (
        <Card>
          <CardHeader className="py-5">
            <CardTitle>提示</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>部分功能需要配置 Cookie、代理、browser_info 等参数。</div>
            <div>请在“设置”页面完整配置后再开始大批量任务。</div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
