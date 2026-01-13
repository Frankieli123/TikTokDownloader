import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { api } from "@/lib/api"
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

type Platform = "douyin" | "tiktok"

export function DownloadPage() {
  const navigate = useNavigate()

  const [detailPlatform, setDetailPlatform] = useState<Platform>("douyin")
  const [detailText, setDetailText] = useState("")
  const [detailOriginal, setDetailOriginal] = useState(false)
  const [detailPending, setDetailPending] = useState(false)

  const [accountPlatform, setAccountPlatform] = useState<Platform>("douyin")
  const [accountText, setAccountText] = useState("")
  const [accountTab, setAccountTab] = useState("post")
  const [accountEarliest, setAccountEarliest] = useState("")
  const [accountLatest, setAccountLatest] = useState("")
  const [accountPages, setAccountPages] = useState("")
  const [accountMark, setAccountMark] = useState("")
  const [accountPending, setAccountPending] = useState(false)

  const [mixPlatform, setMixPlatform] = useState<Platform>("douyin")
  const [mixText, setMixText] = useState("")
  const [mixMark, setMixMark] = useState("")
  const [mixPending, setMixPending] = useState(false)

  const [favoritesMessage, setFavoritesMessage] = useState<string | null>(null)
  const [favoritesPending, setFavoritesPending] = useState(false)
  const [collectsLoading, setCollectsLoading] = useState(false)
  const [collects, setCollects] = useState<{ id: string; name: string }[]>([])
  const [selectedCollectIds, setSelectedCollectIds] = useState<string[]>([])
  const [mixCollectionsLoading, setMixCollectionsLoading] = useState(false)
  const [mixCollections, setMixCollections] = useState<{ id: string; title: string }[]>([])
  const [selectedMixCollectionIds, setSelectedMixCollectionIds] = useState<string[]>([])
  const [mixCollectionMark, setMixCollectionMark] = useState("")

  const goTask = (taskId: string) => navigate(`/tasks?task=${encodeURIComponent(taskId)}`)

  const loadCollects = async () => {
    setCollectsLoading(true)
    setFavoritesMessage(null)
    try {
      const data = await api.listDouyinCollects()
      setCollects(data)
      setSelectedCollectIds([])
    } catch (e) {
      setFavoritesMessage(String(e))
    } finally {
      setCollectsLoading(false)
    }
  }

  const loadMixCollections = async () => {
    setMixCollectionsLoading(true)
    setFavoritesMessage(null)
    try {
      const data = await api.listDouyinMixCollections()
      setMixCollections(data)
      setSelectedMixCollectionIds([])
    } catch (e) {
      setFavoritesMessage(String(e))
    } finally {
      setMixCollectionsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <Card>
        <CardHeader className="py-5">
          <CardTitle>批量下载</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="detail" className="w-full">
            <TabsList>
              <TabsTrigger value="detail">链接作品</TabsTrigger>
              <TabsTrigger value="account">账号作品</TabsTrigger>
              <TabsTrigger value="mix">合集作品</TabsTrigger>
              <TabsTrigger value="favorites">收藏</TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>平台</Label>
                  <Select value={detailPlatform} onValueChange={(v) => setDetailPlatform(v as Platform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="douyin">抖音</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {detailPlatform === "tiktok" ? (
                  <div className="flex items-center gap-2 pt-8">
                    <Checkbox
                      id="detailOriginal"
                      checked={detailOriginal}
                      onCheckedChange={(v) => setDetailOriginal(v === true)}
                    />
                    <Label htmlFor="detailOriginal" className="text-sm font-normal">
                      原画
                    </Label>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>链接文本</Label>
                <Textarea
                  value={detailText}
                  onChange={(e) => setDetailText(e.target.value)}
                  rows={8}
                  placeholder="粘贴多个分享链接或完整链接，空格/换行分隔"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={detailPending || !detailText.trim()}
                  onClick={async () => {
                    setDetailPending(true)
                    try {
                      const task =
                        detailPlatform === "tiktok" && detailOriginal
                          ? await api.createDownloadTikTokOriginalTask({ text: detailText })
                          : await api.createDownloadDetailTask({ platform: detailPlatform, text: detailText })
                      goTask(task.id)
                    } finally {
                      setDetailPending(false)
                    }
                  }}
                >
                  开始下载
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="account" className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>平台</Label>
                  <Select value={accountPlatform} onValueChange={(v) => setAccountPlatform(v as Platform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="douyin">抖音</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select value={accountTab} onValueChange={setAccountTab}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">发布</SelectItem>
                      <SelectItem value="favorite">喜欢</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>最早日期</Label>
                  <Input value={accountEarliest} onChange={(e) => setAccountEarliest(e.target.value)} placeholder="YYYY/MM/DD 或天数" />
                </div>
                <div className="space-y-2">
                  <Label>最晚日期</Label>
                  <Input value={accountLatest} onChange={(e) => setAccountLatest(e.target.value)} placeholder="YYYY/MM/DD 或天数" />
                </div>

                <div className="space-y-2">
                  <Label>页数</Label>
                  <Input value={accountPages} onChange={(e) => setAccountPages(e.target.value)} placeholder="留空表示自动" />
                </div>
                <div className="space-y-2">
                  <Label>标识</Label>
                  <Input value={accountMark} onChange={(e) => setAccountMark(e.target.value)} placeholder="可选" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>账号链接文本</Label>
                <Textarea
                  value={accountText}
                  onChange={(e) => setAccountText(e.target.value)}
                  rows={8}
                  placeholder="粘贴多个账号主页链接，空格/换行分隔"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={accountPending || !accountText.trim()}
                  onClick={async () => {
                    setAccountPending(true)
                    try {
                      const pages = accountPages.trim() ? Number(accountPages) : null
                      const task = await api.createDownloadAccountTask({
                        platform: accountPlatform,
                        text: accountText,
                        tab: accountTab,
                        earliest: accountEarliest.trim() || null,
                        latest: accountLatest.trim() || null,
                        pages: Number.isFinite(pages) ? pages : null,
                        mark: accountMark,
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
            </TabsContent>

            <TabsContent value="favorites" className="mt-6 space-y-6">
              {favoritesMessage ? (
                <div className="text-sm text-destructive">{favoritesMessage}</div>
              ) : null}

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
                            onClick={() => setSelectedCollectIds(collects.map((c) => c.id))}
                            disabled={favoritesPending}
                          >
                            全选
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCollectIds([])}
                            disabled={favoritesPending || selectedCollectIds.length === 0}
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
                                checked={selectedCollectIds.includes(c.id)}
                                onCheckedChange={(v) => {
                                  setSelectedCollectIds((prev) =>
                                    v === true ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                                  )
                                }}
                              />
                              <Label htmlFor={`collect-${c.id}`} className="text-sm font-normal">
                                {c.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={favoritesPending || selectedCollectIds.length === 0}
                          onClick={async () => {
                            setFavoritesPending(true)
                            setFavoritesMessage(null)
                            try {
                              const items = collects.filter((c) => selectedCollectIds.includes(c.id))
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
                            onClick={() => setSelectedMixCollectionIds(mixCollections.map((c) => c.id))}
                            disabled={favoritesPending}
                          >
                            全选
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMixCollectionIds([])}
                            disabled={favoritesPending || selectedMixCollectionIds.length === 0}
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
                                checked={selectedMixCollectionIds.includes(c.id)}
                                onCheckedChange={(v) => {
                                  setSelectedMixCollectionIds((prev) =>
                                    v === true ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                                  )
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
                            value={mixCollectionMark}
                            onChange={(e) => setMixCollectionMark(e.target.value)}
                            placeholder="可选"
                            className="w-64"
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={favoritesPending || selectedMixCollectionIds.length === 0}
                          onClick={async () => {
                            setFavoritesPending(true)
                            setFavoritesMessage(null)
                            try {
                              const items = mixCollections.filter((c) => selectedMixCollectionIds.includes(c.id))
                              const task = await api.createDownloadMixCollectionTask({
                                items,
                                mark: mixCollectionMark.trim() ? mixCollectionMark.trim() : undefined,
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
            </TabsContent>

            <TabsContent value="mix" className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>平台</Label>
                  <Select value={mixPlatform} onValueChange={(v) => setMixPlatform(v as Platform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="douyin">抖音</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>标识</Label>
                  <Input value={mixMark} onChange={(e) => setMixMark(e.target.value)} placeholder="可选" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>合集链接文本</Label>
                <Textarea
                  value={mixText}
                  onChange={(e) => setMixText(e.target.value)}
                  rows={8}
                  placeholder="粘贴多个合集链接，空格/换行分隔"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={mixPending || !mixText.trim()}
                  onClick={async () => {
                    setMixPending(true)
                    try {
                      const task = await api.createDownloadMixTask({
                        platform: mixPlatform,
                        text: mixText,
                        mark: mixMark,
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-5">
          <CardTitle>提示</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>部分功能需要配置 Cookie、代理、browser_info 等参数。</div>
          <div>请在“设置”页面完整配置后再开始大批量任务。</div>
        </CardContent>
      </Card>
    </div>
  )
}
