import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type Platform = "douyin" | "tiktok"
type SearchMode = "general" | "video" | "user" | "live"

export function CollectPage() {
  const navigate = useNavigate()
  const goTask = (taskId: string) => navigate(`/tasks?task=${encodeURIComponent(taskId)}`)

  const [livePlatform, setLivePlatform] = useState<Platform>("douyin")
  const [liveText, setLiveText] = useState("")
  const [liveDownload, setLiveDownload] = useState(false)
  const [liveQuality, setLiveQuality] = useState("")
  const [liveCookie, setLiveCookie] = useState("")
  const [liveProxy, setLiveProxy] = useState("")
  const [livePending, setLivePending] = useState(false)

  const [commentText, setCommentText] = useState("")
  const [commentPages, setCommentPages] = useState("1")
  const [commentReply, setCommentReply] = useState(false)
  const [commentCursor, setCommentCursor] = useState("0")
  const [commentCount, setCommentCount] = useState("20")
  const [commentCountReply, setCommentCountReply] = useState("3")
  const [commentCookie, setCommentCookie] = useState("")
  const [commentProxy, setCommentProxy] = useState("")
  const [commentPending, setCommentPending] = useState(false)

  const [userText, setUserText] = useState("")
  const [userCookie, setUserCookie] = useState("")
  const [userProxy, setUserProxy] = useState("")
  const [userPending, setUserPending] = useState(false)

  const [hotCookie, setHotCookie] = useState("")
  const [hotProxy, setHotProxy] = useState("")
  const [hotPending, setHotPending] = useState(false)

  const [searchMode, setSearchMode] = useState<SearchMode>("general")
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchPages, setSearchPages] = useState("1")
  const [searchOffset, setSearchOffset] = useState("0")
  const [searchCount, setSearchCount] = useState("10")
  const [searchSortType, setSearchSortType] = useState("0")
  const [searchPublishTime, setSearchPublishTime] = useState("0")
  const [searchDuration, setSearchDuration] = useState("0")
  const [searchRange, setSearchRange] = useState("0")
  const [searchContentType, setSearchContentType] = useState("0")
  const [searchUserFans, setSearchUserFans] = useState("0")
  const [searchUserType, setSearchUserType] = useState("0")
  const [searchCookie, setSearchCookie] = useState("")
  const [searchProxy, setSearchProxy] = useState("")
  const [searchPending, setSearchPending] = useState(false)

  const [message, setMessage] = useState<string | null>(null)

  const toNum = (v: string, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {message ? <div className="text-sm text-destructive">{message}</div> : null}

      <Card>
        <CardHeader className="py-5">
          <CardTitle>采集</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="live" className="w-full">
            <TabsList>
              <TabsTrigger value="live">直播</TabsTrigger>
              <TabsTrigger value="comment">评论</TabsTrigger>
              <TabsTrigger value="search">搜索</TabsTrigger>
              <TabsTrigger value="hot">热榜</TabsTrigger>
              <TabsTrigger value="user">用户数据</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>平台</Label>
                  <Select value={livePlatform} onValueChange={(v) => setLivePlatform(v as Platform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="douyin">抖音</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <Checkbox checked={liveDownload} onCheckedChange={(v) => setLiveDownload(Boolean(v))} />
                  <Label>同时下载（需要 ffmpeg）</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>直播链接/房间号文本</Label>
                <Textarea
                  value={liveText}
                  onChange={(e) => setLiveText(e.target.value)}
                  rows={6}
                  placeholder="粘贴多个链接，空格/换行分隔"
                />
              </div>

              <div className="space-y-2">
                <Label>画质（可选）</Label>
                <Input value={liveQuality} onChange={(e) => setLiveQuality(e.target.value)} placeholder="如：origin 或 1" />
              </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={liveCookie} onChange={(e) => setLiveCookie(e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={liveProxy} onChange={(e) => setLiveProxy(e.target.value)} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={livePending || !liveText.trim()}
                  onClick={async () => {
                    setLivePending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectLiveTask({
                        platform: livePlatform,
                        text: liveText,
                        download: liveDownload,
                        quality: liveQuality.trim() || null,
                        cookie: liveCookie.trim() || null,
                        proxy: liveProxy.trim() || null,
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
            </TabsContent>

            <TabsContent value="comment" className="mt-6 space-y-6">
              <div className="text-sm text-muted-foreground">评论采集需要先在设置中启用“存储格式”。</div>
              <div className="space-y-2">
                <Label>作品链接文本</Label>
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={6}
                  placeholder="粘贴多个作品链接，空格/换行分隔"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>页数</Label>
                  <Input value={commentPages} onChange={(e) => setCommentPages(e.target.value)} placeholder="1" />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <Checkbox checked={commentReply} onCheckedChange={(v) => setCommentReply(Boolean(v))} />
                  <Label>采集回复</Label>
                </div>
              </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>cursor</Label>
                      <Input value={commentCursor} onChange={(e) => setCommentCursor(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>count</Label>
                      <Input value={commentCount} onChange={(e) => setCommentCount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>count_reply</Label>
                      <Input value={commentCountReply} onChange={(e) => setCommentCountReply(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={commentCookie} onChange={(e) => setCommentCookie(e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={commentProxy} onChange={(e) => setCommentProxy(e.target.value)} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={commentPending || !commentText.trim()}
                  onClick={async () => {
                    setCommentPending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectCommentTask({
                        text: commentText,
                        pages: toNum(commentPages, 1),
                        cursor: toNum(commentCursor, 0),
                        count: toNum(commentCount, 20),
                        count_reply: toNum(commentCountReply, 3),
                        reply: commentReply,
                        cookie: commentCookie.trim() || null,
                        proxy: commentProxy.trim() || null,
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
            </TabsContent>

            <TabsContent value="search" className="mt-6 space-y-6">
              <div className="text-sm text-muted-foreground">搜索采集需要先在设置中启用“存储格式”。</div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>模式</Label>
                  <Select value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
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
                  <Input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>页数</Label>
                  <Input value={searchPages} onChange={(e) => setSearchPages(e.target.value)} />
                </div>
              </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>offset</Label>
                      <Input value={searchOffset} onChange={(e) => setSearchOffset(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>count</Label>
                      <Input value={searchCount} onChange={(e) => setSearchCount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>sort_type</Label>
                      <Input value={searchSortType} onChange={(e) => setSearchSortType(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>publish_time</Label>
                      <Input value={searchPublishTime} onChange={(e) => setSearchPublishTime(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>duration</Label>
                      <Input value={searchDuration} onChange={(e) => setSearchDuration(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>search_range</Label>
                      <Input value={searchRange} onChange={(e) => setSearchRange(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>content_type</Label>
                      <Input value={searchContentType} onChange={(e) => setSearchContentType(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>douyin_user_fans</Label>
                      <Input value={searchUserFans} onChange={(e) => setSearchUserFans(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>douyin_user_type</Label>
                      <Input value={searchUserType} onChange={(e) => setSearchUserType(e.target.value)} />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={searchCookie} onChange={(e) => setSearchCookie(e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={searchProxy} onChange={(e) => setSearchProxy(e.target.value)} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={searchPending || !searchKeyword.trim()}
                  onClick={async () => {
                    setSearchPending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectSearchTask({
                        mode: searchMode,
                        keyword: searchKeyword,
                        pages: toNum(searchPages, 1),
                        offset: toNum(searchOffset, 0),
                        count: toNum(searchCount, 10),
                        sort_type: toNum(searchSortType, 0),
                        publish_time: toNum(searchPublishTime, 0),
                        duration: toNum(searchDuration, 0),
                        search_range: toNum(searchRange, 0),
                        content_type: toNum(searchContentType, 0),
                        douyin_user_fans: toNum(searchUserFans, 0),
                        douyin_user_type: toNum(searchUserType, 0),
                        cookie: searchCookie.trim() || null,
                        proxy: searchProxy.trim() || null,
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
            </TabsContent>

            <TabsContent value="hot" className="mt-6 space-y-6">
              <div className="text-sm text-muted-foreground">热榜采集需要先在设置中启用“存储格式”。</div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={hotCookie} onChange={(e) => setHotCookie(e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={hotProxy} onChange={(e) => setHotProxy(e.target.value)} />
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
                        cookie: hotCookie.trim() || null,
                        proxy: hotProxy.trim() || null,
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
            </TabsContent>

            <TabsContent value="user" className="mt-6 space-y-6">
              <div className="text-sm text-muted-foreground">用户数据采集需要先在设置中启用“存储格式”。</div>

              <div className="space-y-2">
                <Label>账号链接文本</Label>
                <Textarea
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  rows={6}
                  placeholder="粘贴多个账号主页链接，空格/换行分隔"
                />
              </div>

              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">高级</summary>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>临时 Cookie（可选）</Label>
                    <Textarea value={userCookie} onChange={(e) => setUserCookie(e.target.value)} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>临时代理（可选）</Label>
                    <Input value={userProxy} onChange={(e) => setUserProxy(e.target.value)} />
                  </div>
                </div>
              </details>

              <div className="flex justify-end">
                <Button
                  disabled={userPending || !userText.trim()}
                  onClick={async () => {
                    setUserPending(true)
                    setMessage(null)
                    try {
                      const task = await api.createCollectUserDataTask({
                        text: userText,
                        cookie: userCookie.trim() || null,
                        proxy: userProxy.trim() || null,
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

