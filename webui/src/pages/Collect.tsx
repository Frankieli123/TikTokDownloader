import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { api } from "@/lib/api"
import { usePlatform } from "@/lib/platform"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type ApiPlatform = "douyin" | "tiktok"
type CollectTab = "live" | "comment" | "search" | "hot" | "user"
type SearchMode = "general" | "video" | "user" | "live"

type CollectPlatformState = {
  tab: CollectTab

  liveText: string
  liveDownload: boolean
  liveQuality: string
  liveCookie: string
  liveProxy: string

  commentText: string
  commentPages: string
  commentReply: boolean
  commentCursor: string
  commentCount: string
  commentCountReply: string
  commentCookie: string
  commentProxy: string

  userText: string
  userCookie: string
  userProxy: string

  hotCookie: string
  hotProxy: string

  searchMode: SearchMode
  searchKeyword: string
  searchPages: string
  searchOffset: string
  searchCount: string
  searchSortType: string
  searchPublishTime: string
  searchDuration: string
  searchRange: string
  searchContentType: string
  searchUserFans: string
  searchUserType: string
  searchCookie: string
  searchProxy: string
}

function createDefaultPlatformState(): CollectPlatformState {
  return {
    tab: "live",
    liveText: "",
    liveDownload: false,
    liveQuality: "",
    liveCookie: "",
    liveProxy: "",
    commentText: "",
    commentPages: "1",
    commentReply: false,
    commentCursor: "0",
    commentCount: "20",
    commentCountReply: "3",
    commentCookie: "",
    commentProxy: "",
    userText: "",
    userCookie: "",
    userProxy: "",
    hotCookie: "",
    hotProxy: "",
    searchMode: "general",
    searchKeyword: "",
    searchPages: "1",
    searchOffset: "0",
    searchCount: "10",
    searchSortType: "0",
    searchPublishTime: "0",
    searchDuration: "0",
    searchRange: "0",
    searchContentType: "0",
    searchUserFans: "0",
    searchUserType: "0",
    searchCookie: "",
    searchProxy: "",
  }
}

export function CollectPage() {
  const navigate = useNavigate()
  const goTask = (taskId: string) => navigate(`/tasks?task=${encodeURIComponent(taskId)}`)

  const { platform } = usePlatform()
  const supportedPlatform = platform === "douyin" || platform === "tiktok"
  const currentPlatform: ApiPlatform = platform === "tiktok" ? "tiktok" : "douyin"
  const isTikTok = currentPlatform === "tiktok"
  const [platformState, setPlatformState] = useState<Record<ApiPlatform, CollectPlatformState>>(() => ({
    douyin: createDefaultPlatformState(),
    tiktok: createDefaultPlatformState(),
  }))
  const state = platformState[currentPlatform]
  const updateState = (patch: Partial<CollectPlatformState>) => {
    setPlatformState((prev) => ({
      ...prev,
      [currentPlatform]: { ...prev[currentPlatform], ...patch },
    }))
  }

  const [livePending, setLivePending] = useState(false)

  const [commentPending, setCommentPending] = useState(false)

  const [userPending, setUserPending] = useState(false)

  const [hotPending, setHotPending] = useState(false)

  const [searchPending, setSearchPending] = useState(false)

  const [message, setMessage] = useState<string | null>(null)

  const toNum = (v: string, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {!supportedPlatform ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            该平台暂未接入
          </CardContent>
        </Card>
      ) : (
        <>
          {message ? <div className="text-sm text-destructive">{message}</div> : null}

          <Tabs value={state.tab} onValueChange={(v) => updateState({ tab: v as CollectTab })} className="w-full">
            <TabsList>
              <TabsTrigger value="live">直播</TabsTrigger>
              {!isTikTok ? (
                <>
                  <TabsTrigger value="comment">评论</TabsTrigger>
                  <TabsTrigger value="search">搜索</TabsTrigger>
                  <TabsTrigger value="hot">热榜</TabsTrigger>
                  <TabsTrigger value="user">用户数据</TabsTrigger>
                </>
              ) : null}
            </TabsList>

            <TabsContent value="live" className="mt-6">
              <Card>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={state.liveDownload}
                      onCheckedChange={(v) => updateState({ liveDownload: Boolean(v) })}
                    />
                    <Label>同时下载（需要 ffmpeg）</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>直播链接/房间号文本</Label>
                    <Textarea
                      value={state.liveText}
                      onChange={(e) => updateState({ liveText: e.target.value })}
                      rows={6}
                      placeholder="粘贴多个链接，空格/换行分隔"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>画质（可选）</Label>
                    <Input
                      value={state.liveQuality}
                      onChange={(e) => updateState({ liveQuality: e.target.value })}
                      placeholder="如：origin 或 1"
                    />
                  </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea
                      value={state.liveCookie}
                      onChange={(e) => updateState({ liveCookie: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={state.liveProxy} onChange={(e) => updateState({ liveProxy: e.target.value })} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={livePending || !state.liveText.trim()}
                  onClick={async () => {
                    setLivePending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectLiveTask({
                        platform: currentPlatform,
                        text: state.liveText,
                        download: state.liveDownload,
                        quality: state.liveQuality.trim() || null,
                        cookie: state.liveCookie.trim() || null,
                        proxy: state.liveProxy.trim() || null,
                      })
                      goTask(task.id)
                    } catch (e) {
                      setMessage(String(e))
                    } finally {
                      setLivePending(false)
                    }
                  }}
                >
                  开始
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {!isTikTok ? (
          <TabsContent value="comment" className="mt-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="text-sm text-muted-foreground">评论采集需要先在设置中启用“存储格式”。</div>
                <div className="space-y-2">
                  <Label>作品链接文本</Label>
                  <Textarea
                    value={state.commentText}
                  onChange={(e) => updateState({ commentText: e.target.value })}
                  rows={6}
                  placeholder="粘贴多个作品链接，空格/换行分隔"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>页数</Label>
                  <Input
                    value={state.commentPages}
                    onChange={(e) => updateState({ commentPages: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <Checkbox checked={state.commentReply} onCheckedChange={(v) => updateState({ commentReply: Boolean(v) })} />
                  <Label>采集回复</Label>
                </div>
              </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>cursor</Label>
                      <Input
                        value={state.commentCursor}
                        onChange={(e) => updateState({ commentCursor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>count</Label>
                      <Input
                        value={state.commentCount}
                        onChange={(e) => updateState({ commentCount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>count_reply</Label>
                      <Input
                        value={state.commentCountReply}
                        onChange={(e) => updateState({ commentCountReply: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea
                      value={state.commentCookie}
                      onChange={(e) => updateState({ commentCookie: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input
                      value={state.commentProxy}
                      onChange={(e) => updateState({ commentProxy: e.target.value })}
                    />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={commentPending || !state.commentText.trim()}
                  onClick={async () => {
                    setCommentPending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectCommentTask({
                        text: state.commentText,
                        pages: toNum(state.commentPages, 1),
                        cursor: toNum(state.commentCursor, 0),
                        count: toNum(state.commentCount, 20),
                        count_reply: toNum(state.commentCountReply, 3),
                        reply: state.commentReply,
                        cookie: state.commentCookie.trim() || null,
                        proxy: state.commentProxy.trim() || null,
                      })
                      goTask(task.id)
                    } catch (e) {
                      setMessage(String(e))
                    } finally {
                      setCommentPending(false)
                    }
                  }}
                >
                  开始
                </Button>
              </div>
              </CardContent>
            </Card>
            </TabsContent>
        ) : null}

        {!isTikTok ? (
          <TabsContent value="search" className="mt-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="text-sm text-muted-foreground">搜索采集需要先在设置中启用“存储格式”。</div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>模式</Label>
                  <Select value={state.searchMode} onValueChange={(v) => updateState({ searchMode: v as SearchMode })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">综合</SelectItem>
                      <SelectItem value="video">视频</SelectItem>
                      <SelectItem value="user">用户</SelectItem>
                      <SelectItem value="live">直播</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>关键词</Label>
                  <Input value={state.searchKeyword} onChange={(e) => updateState({ searchKeyword: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>页数</Label>
                  <Input value={state.searchPages} onChange={(e) => updateState({ searchPages: e.target.value })} />
                </div>
              </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>offset</Label>
                      <Input value={state.searchOffset} onChange={(e) => updateState({ searchOffset: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>count</Label>
                      <Input value={state.searchCount} onChange={(e) => updateState({ searchCount: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>sort_type</Label>
                      <Input value={state.searchSortType} onChange={(e) => updateState({ searchSortType: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>publish_time</Label>
                      <Input value={state.searchPublishTime} onChange={(e) => updateState({ searchPublishTime: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>duration</Label>
                      <Input value={state.searchDuration} onChange={(e) => updateState({ searchDuration: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>search_range</Label>
                      <Input value={state.searchRange} onChange={(e) => updateState({ searchRange: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>content_type</Label>
                      <Input value={state.searchContentType} onChange={(e) => updateState({ searchContentType: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>douyin_user_fans</Label>
                      <Input value={state.searchUserFans} onChange={(e) => updateState({ searchUserFans: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>douyin_user_type</Label>
                      <Input value={state.searchUserType} onChange={(e) => updateState({ searchUserType: e.target.value })} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={state.searchCookie} onChange={(e) => updateState({ searchCookie: e.target.value })} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={state.searchProxy} onChange={(e) => updateState({ searchProxy: e.target.value })} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={searchPending || !state.searchKeyword.trim()}
                  onClick={async () => {
                    setSearchPending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectSearchTask({
                        mode: state.searchMode,
                        keyword: state.searchKeyword,
                        pages: toNum(state.searchPages, 1),
                        offset: toNum(state.searchOffset, 0),
                        count: toNum(state.searchCount, 10),
                        sort_type: toNum(state.searchSortType, 0),
                        publish_time: toNum(state.searchPublishTime, 0),
                        duration: toNum(state.searchDuration, 0),
                        search_range: toNum(state.searchRange, 0),
                        content_type: toNum(state.searchContentType, 0),
                        douyin_user_fans: toNum(state.searchUserFans, 0),
                        douyin_user_type: toNum(state.searchUserType, 0),
                        cookie: state.searchCookie.trim() || null,
                        proxy: state.searchProxy.trim() || null,
                      })
                      goTask(task.id)
                    } catch (e) {
                      setMessage(String(e))
                    } finally {
                      setSearchPending(false)
                    }
                  }}
                >
                  开始
                </Button>
              </div>
              </CardContent>
            </Card>
            </TabsContent>
        ) : null}

        {!isTikTok ? (
          <TabsContent value="hot" className="mt-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="text-sm text-muted-foreground">热榜采集需要先在设置中启用“存储格式”。</div>

                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                  <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={state.hotCookie} onChange={(e) => updateState({ hotCookie: e.target.value })} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={state.hotProxy} onChange={(e) => updateState({ hotProxy: e.target.value })} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={hotPending}
                  onClick={async () => {
                    setHotPending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectHotTask({
                        cookie: state.hotCookie.trim() || null,
                        proxy: state.hotProxy.trim() || null,
                      })
                      goTask(task.id)
                    } catch (e) {
                      setMessage(String(e))
                    } finally {
                      setHotPending(false)
                    }
                  }}
                >
                  开始
                </Button>
              </div>
              </CardContent>
            </Card>
            </TabsContent>
        ) : null}

        {!isTikTok ? (
          <TabsContent value="user" className="mt-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="text-sm text-muted-foreground">用户数据采集需要先在设置中启用“存储格式”。</div>

                <div className="space-y-2">
                  <Label>账号链接文本</Label>
                  <Textarea
                    value={state.userText}
                    onChange={(e) => updateState({ userText: e.target.value })}
                    rows={6}
                    placeholder="粘贴多个账号主页链接，空格/换行分隔"
                  />
                </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={state.userCookie} onChange={(e) => updateState({ userCookie: e.target.value })} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={state.userProxy} onChange={(e) => updateState({ userProxy: e.target.value })} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={userPending || !state.userText.trim()}
                  onClick={async () => {
                    setUserPending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectUserDataTask({
                        text: state.userText,
                        cookie: state.userCookie.trim() || null,
                        proxy: state.userProxy.trim() || null,
                      })
                      goTask(task.id)
                    } catch (e) {
                      setMessage(String(e))
                    } finally {
                      setUserPending(false)
                    }
                  }}
                >
                  开始
                </Button>
              </div>
              </CardContent>
            </Card>
            </TabsContent>
        ) : null}
          </Tabs>
        </>
      )}
    </div>
  )
}

