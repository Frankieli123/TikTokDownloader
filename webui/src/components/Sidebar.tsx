import { Download, ListChecks, Search, Settings } from "lucide-react"
import { NavLink } from "react-router-dom"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const items = [
    { to: "/download", label: "下载", icon: Download },
    { to: "/collect", label: "采集", icon: Search },
    { to: "/tasks", label: "任务", icon: ListChecks },
    { to: "/settings", label: "设置", icon: Settings },
  ] as const

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="border-b px-5 py-4 text-sm font-semibold">
        DouK-Downloader
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? "default" : "ghost" }),
                "w-full justify-start gap-2"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t px-5 py-3 text-xs text-muted-foreground">
        本机 Web UI
      </div>
    </aside>
  )
}
