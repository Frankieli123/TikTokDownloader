import { useEffect, useRef, useState } from "react"
import { Copy, Minus, Square, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type DesktopWindowApi = {
  minimize?: () => void
  toggle_maximize?: () => Promise<boolean>
  close?: () => void
  is_maximized?: () => Promise<boolean>
  begin_drag?: () => void
}

function getDesktopApi(): DesktopWindowApi | null {
  if (typeof window === "undefined") return null
  const pywebview = (window as any).pywebview as { api?: DesktopWindowApi } | undefined
  return pywebview?.api ?? null
}

export function TitleBar() {
  const api = getDesktopApi()
  const [maximized, setMaximized] = useState(false)
  const syncToken = useRef(0)

  const syncMaximized = () => {
    if (!api?.is_maximized) return

    const token = ++syncToken.current
    api
      .is_maximized()
      .then((value) => {
        if (syncToken.current !== token) return
        setMaximized(value)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!api?.is_maximized) return

    syncMaximized()
    window.addEventListener("resize", syncMaximized)
    return () => {
      window.removeEventListener("resize", syncMaximized)
    }
  }, [api])

  if (!api) return null

  const handleToggleMaximize = async () => {
    const token = ++syncToken.current
    const optimisticNext = !maximized
    setMaximized(optimisticNext)

    try {
      await api.toggle_maximize?.()
    } catch {
      if (syncToken.current === token) {
        setMaximized(!optimisticNext)
      }
      return
    }

    syncMaximized()
  }

  return (
    <div className="flex h-7 shrink-0 select-none items-center justify-between bg-background">
      <div
        className="pywebview-drag-region flex h-full flex-1 items-center px-2"
        onMouseDown={(e) => {
          if (!api.begin_drag) return
          e.preventDefault()
          api.begin_drag()
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/DouK-Downloader.png`}
          alt=""
          className="h-4 w-4"
          draggable={false}
          title="禾风起工具箱"
        />
      </div>
      <div className="mr-1 flex h-full items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-none hover:bg-muted"
          onClick={() => api.minimize?.()}
          title="最小化"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-none hover:bg-muted"
          onClick={handleToggleMaximize}
          title={maximized ? "还原" : "最大化"}
        >
          {maximized ? <Copy className="!h-3 !w-3" /> : <Square className="!h-3 !w-3" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-none hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => api.close?.()}
          title="关闭"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
