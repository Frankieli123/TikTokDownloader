import { Minus, Square, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type DesktopWindowApi = {
  minimize?: () => void
  toggle_maximize?: () => void
  close?: () => void
}

function getDesktopApi(): DesktopWindowApi | null {
  if (typeof window === "undefined") return null
  const pywebview = (window as any).pywebview as { api?: DesktopWindowApi } | undefined
  return pywebview?.api ?? null
}

export function TitleBar() {
  const api = getDesktopApi()
  if (!api) return null

  return (
    <div className="flex h-7 shrink-0 items-center justify-between bg-background">
      <div className="pywebview-drag-region h-full flex-1" />
      <div className="flex h-full items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-full w-8 rounded-none hover:bg-muted"
          onClick={() => api.minimize?.()}
          title="最小化"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-full w-8 rounded-none hover:bg-muted"
          onClick={() => api.toggle_maximize?.()}
          title="最大化/还原"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-full w-8 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => api.close?.()}
          title="关闭"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
