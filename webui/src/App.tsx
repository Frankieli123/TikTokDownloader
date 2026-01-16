import { useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { api } from "@/lib/api"
import type { AppInfo } from "@/types"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Sidebar } from "@/components/Sidebar"
import { TitleBar } from "@/components/TitleBar"
import { ToastHost } from "@/components/ToastHost"
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
    return () => {
      mounted = false
    }
  }, [])

  const needDisclaimer = Boolean(appInfo) && !Boolean(appInfo?.disclaimer_accepted)

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="app-scroll flex-1 overflow-auto bg-muted/10 px-6 pb-6 pt-1 lg:px-8 lg:pb-8 lg:pt-2">
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

      <ToastHost />
    </div>
  )
}
