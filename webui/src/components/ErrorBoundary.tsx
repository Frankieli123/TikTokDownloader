import { Component, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="p-6">
        <Card className="mx-auto max-w-3xl">
          <CardHeader className="py-5">
            <CardTitle>界面发生错误</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              请刷新页面或重启程序。如果重复出现，通常是某个配置字段为空或格式不符合预期。
            </div>
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
              {String(this.state.error.stack || this.state.error.message || this.state.error)}
            </pre>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => window.location.reload()}>
                刷新
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

