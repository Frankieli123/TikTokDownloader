import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { api } from "@/lib/api"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export function KuaishouDownloadPage() {
  const navigate = useNavigate()
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const payloadText = text.trim()
    if (!payloadText) return
    setSubmitting(true)
    try {
      const task = await api.createDownloadKuaishouDetailTask({
        text: payloadText,
      })
      notify.success("任务已创建")
      navigate(`/tasks?task=${encodeURIComponent(task.id)}`)
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <Tabs defaultValue="detail" className="w-full">
        <TabsList>
          <TabsTrigger value="detail">链接作品</TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>链接文本</Label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  placeholder="粘贴多个快手分享链接或完整链接，空格/换行分隔"
                />
              </div>

              <div className="flex justify-start">
                <Button onClick={() => void submit()} disabled={submitting || !text.trim()}>
                  {submitting ? "处理中..." : "开始下载"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="py-5">
          <CardTitle>提示</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>快手 Cookie 支持动态获取（无需登录）。</div>
          <div>若解析/下载失败，建议先在“设置”中配置 Cookie（必要时配置代理）。</div>
        </CardContent>
      </Card>
    </div>
  )
}
