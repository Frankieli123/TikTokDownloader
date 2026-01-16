import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Info, X } from "lucide-react"

import type { ToastEvent } from "@/lib/notify"

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastEvent[]>([])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastEvent>).detail
      setToasts((prev) => [...prev, detail])
      const ttl = detail.type === "error" ? 8000 : 5000
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== detail.id))
      }, ttl)
    }
    window.addEventListener("app-toast", handler)
    return () => window.removeEventListener("app-toast", handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-80 items-start gap-3 rounded-lg border bg-background p-4 shadow-lg ring-1 ring-black/5 duration-300 animate-in slide-in-from-right-full fade-in dark:ring-white/10"
        >
          {toast.type === "success" ? (
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          ) : null}
          {toast.type === "error" ? (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          ) : null}
          {toast.type === "info" ? <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" /> : null}
          <div className="flex-1 break-words text-sm">{toast.message}</div>
          <button
            onClick={() => setToasts((prev) => prev.filter((i) => i.id !== toast.id))}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
