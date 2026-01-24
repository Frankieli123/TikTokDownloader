import { Download, ListChecks, Search, Settings } from "lucide-react"
import { NavLink } from "react-router-dom"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NavBar() {
  const items = [
    { to: "/download", label: "下载", icon: Download },
    { to: "/collect", label: "采集", icon: Search },
    { to: "/tasks", label: "任务", icon: ListChecks },
    { to: "/settings", label: "设置", icon: Settings },
  ] as const

  return (
    <div className="bg-background px-6 py-2 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(buttonVariants({ variant: isActive ? "default" : "ghost", size: "sm" }), "gap-2")
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
