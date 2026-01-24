import { useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { api } from "@/lib/api"
import { notify } from "@/lib/notify"
import type { AppInfo, UpdateInfo } from "@/types"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { NavBar } from "@/components/NavBar"
import { Sidebar } from "@/components/Sidebar"
import { TitleBar } from "@/components/TitleBar"
import { ToastHost } from "@/components/ToastHost"
import { PlatformProvider } from "@/lib/platform"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CollectPage } from "@/pages/Collect"
import { DownloadPage } from "@/pages/Download"
import { SettingsPage } from "@/pages/Settings"
import { TasksPage } from "@/pages/Tasks"

export default function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [disclaimerError, setDisclaimerError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [showUpdate, setShowUpdate] = useState(false)
  const [applyingUpdate, setApplyingUpdate] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const info = await api.getAppInfo()
        if (!mounted) return
        setAppInfo(info)
      } catch (e) {
        if (!mounted) return
        setDisclaimerError(String(e))
      }
    }
    void load()

    const pywebview = (window as any).pywebview as unknown
    if (pywebview) {
      api
        .checkUpdate()
        .then((info) => {
          if (!mounted) return
          if (!info.update_available) return
          const key = info.latest_tag || info.latest_version
          const dismissed = localStorage.getItem("dismissed_update")
          if (dismissed === key) return
          setUpdateInfo(info)
          setShowUpdate(true)
        })
        .catch(() => {})
    }

    return () => {
      mounted = false
    }
  }, [])

  const needDisclaimer = Boolean(appInfo) && !Boolean(appInfo?.disclaimer_accepted)

  const handleDismissUpdate = () => {
    if (updateInfo) {
      localStorage.setItem("dismissed_update", updateInfo.latest_tag || updateInfo.latest_version)
    }
    setShowUpdate(false)
  }

  const handleApplyUpdate = async () => {
    setApplyingUpdate(true)
    try {
      await api.applyUpdate()
      notify.success("正在更新，请稍候…")
      const pywebview = (window as any).pywebview as { api?: { close?: () => void } } | undefined
      if (pywebview?.api?.close) setTimeout(() => pywebview.api?.close?.(), 1500)
    } catch (e) {
      notify.error(`更新失败：${String(e)}`)
      setApplyingUpdate(false)
    }
  }

  return (
    <PlatformProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/10">
            <NavBar />
            <main className="app-scroll flex-1 overflow-auto px-6 pb-6 pt-4 lg:px-8 lg:pb-8">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Navigate to="/download" replace />} />
                  <Route path="/download" element={<DownloadPage />} />
                  <Route path="/collect" element={<CollectPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </ErrorBoundary>
            </main>
          </div>
        </div>

        {needDisclaimer && appInfo ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
            <Card className="w-full max-w-3xl">
              <CardHeader className="py-5">
                <CardTitle>免责声明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">首次使用需要确认免责声明。</div>
                <ScrollArea className="h-[60vh] rounded-md border">
                  <pre className="whitespace-pre-wrap p-4 text-sm leading-relaxed">{appInfo.disclaimer_text}</pre>
                </ScrollArea>

                <Separator />

                {disclaimerError ? <div className="text-sm text-destructive">{disclaimerError}</div> : null}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    disabled={accepting}
                    onClick={async () => {
                      setAccepting(true)
                      setDisclaimerError(null)
                      try {
                        await api.acceptDisclaimer()
                        setAppInfo({ ...appInfo, disclaimer_accepted: true })
                      } catch (e) {
                        setDisclaimerError(String(e))
                      } finally {
                        setAccepting(false)
                      }
                    }}
                  >
                    我已阅读并同意
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!needDisclaimer && showUpdate && updateInfo ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
            <Card className="w-full max-w-lg shadow-lg">
              <CardHeader className="py-5">
                <CardTitle>发现新版本</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm">
                  <div>
                    当前版本：<span className="font-mono">{updateInfo.current_version}</span>
                  </div>
                  <div>
                    最新版本：<span className="font-mono text-primary">{updateInfo.latest_version}</span>
                  </div>
                </div>
                {updateInfo.release_notes ? (
                  <ScrollArea className="h-48 rounded-md border bg-muted/50">
                    <pre className="whitespace-pre-wrap p-3 text-xs leading-relaxed">{updateInfo.release_notes}</pre>
                  </ScrollArea>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={handleDismissUpdate} disabled={applyingUpdate}>
                    以后再说
                  </Button>
                  <Button onClick={() => void handleApplyUpdate()} disabled={applyingUpdate}>
                    {applyingUpdate ? "更新中..." : "下载并更新"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <ToastHost />
      </div>
    </PlatformProvider>
  )
}
