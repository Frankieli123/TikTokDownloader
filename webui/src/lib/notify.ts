type NotifyType = "success" | "error" | "info"

export interface ToastEvent {
  id: string
  message: string
  type: NotifyType
}

export const notify = {
  success: (message: string) => dispatch("success", message),
  error: (message: string) => dispatch("error", message),
  info: (message: string) => dispatch("info", message),
}

function dispatch(type: NotifyType, message: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<ToastEvent>("app-toast", {
      detail: { id: Math.random().toString(36).slice(2), message, type },
    })
  )
}
