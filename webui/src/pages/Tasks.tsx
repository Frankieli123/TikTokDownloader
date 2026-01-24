import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { api } from "@/lib/api"
import { notify } from "@/lib/notify"
import type { UITask } from "@/types"
import { usePlatform } from "@/lib/platform"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type ProgressItem = {
  description: string
  total: number | null
  completed: number
  finished?: boolean
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function formatTime(ts: number | null) {
  if (!ts) return ""
  return new Date(ts * 1000).toLocaleTimeString()
}

function statusVariant(status: string) {
  if (status === "running") return "default"
  if (status === "success") return "secondary"
  if (status === "error") return "destructive"
  return "outline"
}

const STATUS_LABELS: Record<string, string> = {
  queued: "排队中",
  running: "进行中",
  success: "已完成",
  error: "失败",
  cancelled: "已取消",
}

const TYPE_LABELS: Record<string, string> = {
  "download.detail": "下载作品",
  "download.account": "批量下载账号作品",
  "download.mix": "批量下载合集作品",
  "download.collection": "批量下载收藏作品",
  "download.collects": "批量下载收藏夹作品",
  "download.collection_music": "批量下载收藏音乐",
  "download.mix_collection": "批量下载收藏合集作品",
  "download.tiktok_original": "批量下载视频原画",
  "download.kuaishou.detail": "下载快手作品",
  "collect.live": "获取直播拉流地址",
  "collect.comment": "采集作品评论数据",
  "collect.user": "采集账号详细数据",
  "collect.hot": "采集抖音热榜数据",
  "collect.search": "采集搜索结果数据",
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] || status
}

function typeLabel(type: string) {
  return TYPE_LABELS[type] || type
}

export function TasksPage() {
  const [searchParams] = useSearchParams()
  const initialTaskId = searchParams.get("task")
  const { platform } = usePlatform()
  const supportedPlatform = platform === "douyin" || platform === "tiktok" || platform === "kuaishou"
  const currentPlatform = platform

  const taskMatchesPlatform = (task: UITask) => {
    const metaPlatform = String(task.meta["platform"] ?? "")
    if (metaPlatform) return metaPlatform === currentPlatform

    const title = String(task.title || "")
    const normalized = title.toLowerCase()

    if (currentPlatform === "kuaishou") {
      return normalized.includes("快手") || normalized.includes("kuaishou")
    }

    const detected = normalized.includes("tiktok") ? "tiktok" : title.includes("抖音") ? "douyin" : null
    const target = currentPlatform === "tiktok" ? "tiktok" : "douyin"
    return !detected || detected === target
  }

  const [tasks, setTasks] = useState<UITask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId)
  const [logs, setLogs] = useState<unknown[]>([])
  const [progress, setProgress] = useState<Record<string, ProgressItem>>({})
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId])

  const exportLogs = () => {
    if (!selectedTask) return
    const payload = {
      exported_at: new Date().toISOString(),
      task: selectedTask,
      progress,
      events: logs,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `task_${selectedTask.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const openFolder = async () => {
    if (!selectedTaskId) return
    try {
      await api.openTaskFolder(selectedTaskId)
    } catch (e) {
      setError(String(e))
    }
  }

  const refreshTasks = async () => {
    const list = await api.listTasks()
    setTasks(list)
    if (!selectedTaskId && list.length > 0) setSelectedTaskId(list[0].id)
  }

  useEffect(() => {
    if (!supportedPlatform) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setLogs([])
      setProgress({})
      setError(null)
      setSelectedTaskId(null)
      setTasks([])
      return
    }
    let mounted = true
    const load = async () => {
      try {
        const list = await api.listTasks()
        if (!mounted) return
        const filtered = list.filter(taskMatchesPlatform)
        setTasks(filtered)

        if (!selectedTaskId && filtered.length > 0) {
          setSelectedTaskId(filtered[0].id)
          return
        }
        if (selectedTaskId && !filtered.some((t) => t.id === selectedTaskId)) {
          setSelectedTaskId(filtered[0]?.id ?? null)
        }
      } catch (e) {
        if (!mounted) return
        setError(String(e))
      }
    }

    void load()
    const interval = setInterval(() => void load(), 2000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [selectedTaskId, currentPlatform, supportedPlatform])

  useEffect(() => {
    if (!supportedPlatform) return
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setLogs([])
    setProgress({})
    setError(null)

    if (!selectedTaskId) return

    const es = new EventSource(`/ui-api/tasks/${encodeURIComponent(selectedTaskId)}/events`)
    eventSourceRef.current = es

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as any
        const type = String(data.type || "")

        if (type === "progress.add" || type === "progress.update") {
          const taskId = String(data.task_id ?? "")
          if (!taskId) return
          setProgress((prev) => ({
            ...prev,
            [taskId]: {
              description: String(data.description || ""),
              total: data.total === null || data.total === undefined ? null : Number(data.total),
              completed: Number(data.completed || 0),
              finished: prev[taskId]?.finished,
            },
          }))
          return
        }

        if (type === "progress.remove") {
          const taskId = String(data.task_id ?? "")
          if (!taskId) return
          setProgress((prev) =>
            prev[taskId]
              ? {
                  ...prev,
                  [taskId]: { ...prev[taskId], finished: true },
                }
              : prev
          )
          return
        }

        setLogs((prev) => [...prev.slice(-999), data])
      } catch (e) {
        setError(String(e))
        notify.error("Error parsing task event: " + String(e))
      }
    }

    es.onerror = () => {
      const msg = "EventSource disconnected"
      setError(msg)
      notify.error(msg)
    }

    return () => {
      es.close()
    }
  }, [selectedTaskId, supportedPlatform])

  return (
    <div className="mx-auto w-full max-w-6xl">
      {!supportedPlatform ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            该平台暂未接入
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="py-4">
              <CardTitle className="text-base">任务列表</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="flex flex-col">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={`flex w-full flex-col gap-2 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                        selectedTaskId === task.id ? "bg-muted/60" : ""
                      }`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-medium">{task.title}</div>
                        <Badge variant={statusVariant(task.status)} className="shrink-0" title={task.status}>
                          {statusLabel(task.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="truncate font-mono">{task.id}</div>
                        <div className="shrink-0">{formatTime(task.created_at)}</div>
                      </div>
                    </button>
                  ))}
                  {tasks.length === 0 && <div className="p-4 text-sm text-muted-foreground">暂无任务</div>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

      <Card className="md:col-span-2">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">任务详情</CardTitle>
            <div className="flex items-center gap-2">
              {selectedTask?.type.startsWith("download.") ? (
                <Button variant="outline" size="sm" onClick={() => void openFolder()}>
                  打开文件夹
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={exportLogs} disabled={!selectedTask || logs.length === 0}>
                导出日志
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refreshTasks()
                }}
              >
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTask ? (
            <div className="space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" title={selectedTask.type}>
                  {typeLabel(selectedTask.type)}
                </Badge>
                <Badge variant={statusVariant(selectedTask.status)} title={selectedTask.status}>
                  {statusLabel(selectedTask.status)}
                </Badge>
              </div>
              <div className="text-muted-foreground">
                开始: {formatTime(selectedTask.started_at)}{" "}
                {selectedTask.finished_at ? `结束: ${formatTime(selectedTask.finished_at)}` : ""}
              </div>
              {selectedTask.error ? <div className="text-destructive">{selectedTask.error}</div> : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">请选择一个任务</div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">下载进度</div>
            <div className="space-y-2">
              {Object.entries(progress)
                .slice(0, 200)
                .map(([id, item]) => {
                  const percent =
                    item.total && item.total > 0
                      ? Math.min(100, Math.floor((item.completed / item.total) * 100))
                      : 0
                  return (
                    <div key={id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1 truncate">{item.description || `#${id}`}</div>
                      <div className="shrink-0 font-mono text-muted-foreground">
                        {item.total
                          ? `${formatBytes(item.completed)} / ${formatBytes(item.total)}`
                          : `${formatBytes(item.completed)}`}
                      </div>
                      <div className="w-12 shrink-0 text-right font-mono">
                        {item.finished ? "已完成" : item.total ? `${percent}%` : ""}
                      </div>
                    </div>
                  )
                })}
              {Object.keys(progress).length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无下载进度</div>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">事件日志</div>
              {error ? <div className="text-xs text-destructive">{error}</div> : null}
            </div>
            <ScrollArea className="h-[22rem] rounded-md border bg-muted/10 p-3">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((l, idx) => (
                  <div key={idx} className="break-words">
                    {JSON.stringify(l)}
                  </div>
                ))}
                {logs.length === 0 ? (
                  <div className="text-muted-foreground">暂无日志</div>
                ) : null}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
      </div>
      )}
    </div>
  )
}
