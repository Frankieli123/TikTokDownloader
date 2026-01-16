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
    <aside className="flex h-full w-64 flex-col bg-muted/30">
      <div className="px-6 py-1.5 text-sm font-bold tracking-tight">
        禾风起工具箱
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? "default" : "ghost" }),
                "w-full justify-start gap-2 font-medium"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs font-medium text-muted-foreground/60">
        本机 Web UI
      </div>
    </aside>
  )
}
