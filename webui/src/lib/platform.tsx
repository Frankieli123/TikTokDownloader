import { createContext, type ReactNode, useContext, useMemo, useState } from "react"

export type Platform = "douyin" | "tiktok" | "kuaishou" | "xiaohongshu"

const STORAGE_KEY = "selected_platform"

function normalizePlatform(value: unknown): Platform {
  return value === "tiktok" || value === "douyin" || value === "kuaishou" || value === "xiaohongshu" ? value : "douyin"
}

type PlatformContextValue = {
  platform: Platform
  setPlatform: (platform: Platform) => void
}

const PlatformContext = createContext<PlatformContextValue | null>(null)

export function PlatformProvider(props: { children: ReactNode }) {
  const [platform, setPlatformState] = useState<Platform>(() => normalizePlatform(localStorage.getItem(STORAGE_KEY)))

  const value = useMemo<PlatformContextValue>(
    () => ({
      platform,
      setPlatform: (next) => {
        const normalized = normalizePlatform(next)
        setPlatformState(normalized)
        localStorage.setItem(STORAGE_KEY, normalized)
      },
    }),
    [platform]
  )

  return <PlatformContext.Provider value={value}>{props.children}</PlatformContext.Provider>
}

export function usePlatform() {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider")
  return ctx
}
