import { BookOpen, Clapperboard, Music2, Zap, type LucideIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePlatform, type Platform } from "@/lib/platform"

export function Sidebar() {
  const { platform, setPlatform } = usePlatform()
  const items: { value: Platform; label: string; icon: LucideIcon; disabled?: boolean }[] = [
    { value: "douyin", label: "抖音", icon: Music2 },
    { value: "tiktok", label: "TikTok", icon: Clapperboard },
    { value: "kuaishou", label: "快手", icon: Zap },
    { value: "xiaohongshu", label: "小红书", icon: BookOpen, disabled: true },
  ]

  return (
    <aside className="flex h-full w-64 flex-col bg-muted/30">
      <nav className="flex-1 space-y-1 px-4 pt-2">
        {items.map((item) => {
          const active = platform === item.value
          const disabled = Boolean(item.disabled)
          return (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              className={cn(
                buttonVariants({ variant: active ? "default" : "ghost", size: "sm" }),
                "w-full justify-start gap-2 font-medium",
                disabled && "cursor-not-allowed opacity-50"
              )}
              onClick={() => setPlatform(item.value)}
              title={disabled ? "暂未接入" : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="px-6 py-4 text-xs font-medium text-muted-foreground/60">
        <div className="flex items-center gap-2">
          <img
            src={`${import.meta.env.BASE_URL}images/DouK-Downloader.png`}
            alt=""
            className="h-3.5 w-3.5 opacity-80"
            draggable={false}
          />
          <span>禾风起工具箱</span>
        </div>
      </div>
    </aside>
  )
}
