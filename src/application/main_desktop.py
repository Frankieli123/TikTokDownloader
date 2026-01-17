from __future__ import annotations

from threading import Event, Thread
from time import monotonic, sleep

import httpx

from ..custom import PROJECT_NAME, SERVER_PORT
from .TikTokDownloader import TikTokDownloader
from .main_webui import WebUIServer

__all__ = ["run_desktop"]


def _pick_port(preferred: int) -> int:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        if s.connect_ex(("127.0.0.1", preferred)) != 0:
            return preferred
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


def _wait_http_ok(url: str, timeout_s: float) -> bool:
    deadline = monotonic() + timeout_s
    while monotonic() < deadline:
        try:
            r = httpx.get(url, timeout=1.0)
            if r.status_code < 500:
                return True
        except Exception:
            pass
        sleep(0.15)
    return False


def run_desktop() -> None:
    import os
    import sys
    import traceback
    from datetime import datetime
    from html import escape as _escape_html
    from pathlib import Path

    log_path = (
        Path(os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA") or Path.home())
        / "HeFengQi-Toolbox"
        / "logs"
        / "desktop.log"
    )

    def _log(text: str) -> None:
        try:
            log_path.parent.mkdir(parents=True, exist_ok=True)
            with log_path.open("a", encoding="utf-8") as f:
                f.write(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {text}\n")
        except Exception:
            pass

    def _alert(text: str) -> None:
        if sys.platform == "win32":
            try:
                import ctypes

                ctypes.windll.user32.MessageBoxW(0, text, PROJECT_NAME, 0x10)
                return
            except Exception:
                pass
        print(text)

    def _static_webui_dir() -> Path:
        base = Path(__file__).resolve().parents[2]
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            base = Path(sys._MEIPASS)
        return base.joinpath("static", "webui")

    def _read_webui_css() -> str:
        try:
            import re

            webui_dir = _static_webui_dir()
            index = webui_dir.joinpath("index.html")
            if not index.is_file():
                return ""

            html = index.read_text(encoding="utf-8", errors="ignore")
            hrefs = re.findall(r'href="([^"]+\\.css)"', html)
            parts: list[str] = []
            for href in hrefs:
                rel = href
                if rel.startswith("/ui/"):
                    rel = rel[len("/ui/") :]
                if rel.startswith("/"):
                    rel = rel[1:]
                path = webui_dir.joinpath(rel)
                if path.is_file():
                    parts.append(path.read_text(encoding="utf-8", errors="ignore"))
            return "\n".join(parts)
        except Exception:
            return ""

    port = _pick_port(SERVER_PORT)
    stop_event = Event()
    backend_errors: list[str] = []

    def backend():
        from asyncio import run

        async def runner():
            try:
                async with TikTokDownloader() as downloader:
                    downloader.check_config()
                    await downloader.check_settings(False)
                    await WebUIServer(
                        downloader.parameter,
                        downloader.database,
                    ).run_server(
                        host="127.0.0.1",
                        port=port,
                        log_level="warning",
                        stop_event=stop_event,
                    )
            except Exception:
                backend_errors.append(traceback.format_exc())
                _log(backend_errors[-1].rstrip())

        run(runner())

    thread = Thread(
        target=backend,
        name="douk-webui-backend",
        daemon=True,
    )
    thread.start()

    base = f"http://127.0.0.1:{port}"
    repository_url = f"{base}/ui-api/repository"
    url = f"{base}/ui"

    def _win_message_box(text: str, title: str, flags: int) -> int:
        import ctypes

        return int(ctypes.windll.user32.MessageBoxW(0, text, title, flags))

    def _webview2_version() -> str | None:
        if sys.platform != "win32":
            return None
        try:
            import clr
            from webview.util import interop_dll_path

            clr.AddReference(interop_dll_path("Microsoft.Web.WebView2.Core.dll"))
            from Microsoft.Web.WebView2.Core import CoreWebView2Environment

            v = CoreWebView2Environment.GetAvailableBrowserVersionString()
            return str(v) if v else None
        except Exception:
            return None

    def _install_webview2_runtime() -> bool:
        if sys.platform != "win32":
            return False
        import tempfile
        from pathlib import Path
        from subprocess import DEVNULL, run
        from urllib.request import urlretrieve

        exe = Path(tempfile.gettempdir()).joinpath("MicrosoftEdgeWebview2Setup.exe")
        try:
            urlretrieve("https://go.microsoft.com/fwlink/p/?LinkId=2124703", str(exe))
        except Exception:
            return False

        try:
            run(
                [str(exe), "/silent", "/install"],
                stdout=DEVNULL,
                stderr=DEVNULL,
                check=False,
                creationflags=0x08000000,
            )
        except Exception:
            return False

        deadline = monotonic() + 180
        while monotonic() < deadline:
            if _webview2_version():
                try:
                    exe.unlink(missing_ok=True)
                except Exception:
                    pass
                return True
            sleep(0.5)
        return False

    def _ensure_webview2_runtime() -> bool:
        if sys.platform != "win32":
            return True
        if _webview2_version():
            return True

        r = _win_message_box(
            f"{PROJECT_NAME}\n\n未检测到 Microsoft Edge WebView2 Runtime，是否现在安装？\n\n需要联网下载，可能需要 1-3 分钟。\n安装完成后将继续启动。",
            PROJECT_NAME,
            0x04 | 0x20,
        )
        if r != 6:
            return False

        ok = _install_webview2_runtime()
        if ok:
            _win_message_box("WebView2 Runtime 安装完成。", PROJECT_NAME, 0x00 | 0x40)
        else:
            _win_message_box("WebView2 Runtime 安装失败，请手动安装后重试。", PROJECT_NAME, 0x00 | 0x10)
        return ok

    def fallback(reason: str) -> None:
        message = (
            f"{PROJECT_NAME}\n\n"
            f"桌面窗口启动失败：{reason}\n\n"
            f"日志：{log_path}\n\n"
            "请安装/修复 Microsoft Edge WebView2 Runtime 后重试（Windows 11 通常已自带）"
        )
        try:
            if sys.platform == "win32":
                import ctypes

                ctypes.windll.user32.MessageBoxW(0, message, PROJECT_NAME, 0x10)
                return
        except Exception:
            pass
        print(message)

    try:
        import webview  # pywebview
    except Exception as e:
        try:
            fallback(f"pywebview 不可用：{e!r}")
        finally:
            stop_event.set()
            thread.join(timeout=3)
        return

    is_frozen = bool(getattr(sys, "frozen", False) or getattr(sys, "_MEIPASS", None))
    if is_frozen and not _ensure_webview2_runtime():
        try:
            fallback("用户取消安装 WebView2 Runtime")
        finally:
            stop_event.set()
            thread.join(timeout=3)
        return

    if sys.platform == "win32":
        try:
            webview.settings["DRAG_REGION_SELECTOR"] = ".pywebview-drag-region-disabled"
        except Exception:
            pass

    try:
        webui_css = _read_webui_css()
        log_path_html = _escape_html(str(log_path))

        class _DesktopWindowApi:
            def __init__(self) -> None:
                self._window = None
                self._maximized = False

            def bind(self, window) -> None:
                self._window = window
                try:
                    window.events.maximized += lambda: setattr(self, "_maximized", True)
                    window.events.restored += lambda: setattr(self, "_maximized", False)
                except Exception:
                    pass

            def _native_is_maximized(self) -> bool | None:
                window = self._window
                if window is None or sys.platform != "win32":
                    return None
                try:
                    native = getattr(window, "native", None)
                    if native is None:
                        return None
                    state = getattr(native, "WindowState", None)
                    if state is None:
                        return None
                    text = str(state)
                    if "Maximized" in text:
                        return True
                    if "Normal" in text:
                        return False
                except Exception:
                    return None
                return None

            def begin_drag(self) -> None:
                window = self._window
                if window is None or sys.platform != "win32":
                    return
                try:
                    native = getattr(window, "native", None)
                    if native is None:
                        return
                    import ctypes

                    user32 = ctypes.windll.user32

                    def _drag() -> None:
                        try:
                            hwnd = int(native.Handle.ToInt32())
                            user32.ReleaseCapture()
                            user32.SendMessageW(hwnd, 0xA1, 0x2, 0)
                        except Exception:
                            pass

                    try:
                        if bool(getattr(native, "InvokeRequired", False)):
                            from System import Action

                            native.Invoke(Action(_drag))
                        else:
                            _drag()
                    except Exception:
                        _drag()
                except Exception:
                    pass

            def minimize(self) -> None:
                window = self._window
                if window is None:
                    return
                try:
                    window.minimize()
                except Exception:
                    pass

            def toggle_maximize(self) -> bool:
                window = self._window
                if window is None:
                    return self.is_maximized()

                before = self.is_maximized()
                try:
                    if before:
                        window.restore()
                    else:
                        window.maximize()
                except Exception:
                    return self.is_maximized()

                deadline = monotonic() + 0.5
                while monotonic() < deadline:
                    now = self.is_maximized()
                    if now != before:
                        return now
                    sleep(0.01)
                return self.is_maximized()

            def is_maximized(self) -> bool:
                native = self._native_is_maximized()
                if native is not None:
                    self._maximized = native
                return self._maximized

            def close(self) -> None:
                window = self._window
                if window is None:
                    return
                try:
                    window.destroy()
                except Exception:
                    pass

        desktop_api = _DesktopWindowApi()
        loading_html = f"""<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{PROJECT_NAME}</title>
    <style>
      {webui_css}
      html, body {{ height: 100%; margin: 0; }}
      @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
      .animate-spin {{ animation: spin 1s linear infinite; }}
    </style>
  </head>
  <body>
    <div class="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <div class="flex h-7 shrink-0 items-center justify-between bg-background">
        <div class="pywebview-drag-region h-full flex-1" onmousedown="window.pywebview && window.pywebview.api && window.pywebview.api.begin_drag && window.pywebview.api.begin_drag()"></div>
        <div class="flex h-full items-center">
          <button type="button" class="h-full w-7 hover:bg-muted" onclick="window.pywebview && window.pywebview.api && window.pywebview.api.minimize && window.pywebview.api.minimize()" title="最小化">
            <span class="text-sm leading-none">—</span>
          </button>
          <button type="button" class="h-full w-7 hover:bg-muted" onclick="window.pywebview && window.pywebview.api && window.pywebview.api.toggle_maximize && window.pywebview.api.toggle_maximize()" title="最大化/还原">
            <span class="text-xs leading-none">□</span>
          </button>
          <button type="button" class="h-full w-7 hover:bg-destructive hover:text-destructive-foreground" onclick="window.pywebview && window.pywebview.api && window.pywebview.api.close && window.pywebview.api.close()" title="关闭">
            <span class="text-sm leading-none">×</span>
          </button>
        </div>
      </div>
      <div class="flex flex-1 overflow-hidden">
        <aside class="flex h-full w-64 flex-col bg-muted/30">
          <nav class="flex-1 space-y-2 px-4 pt-6 lg:pt-8">
            <div class="h-10 w-full rounded-md bg-muted/40"></div>
            <div class="h-10 w-full rounded-md bg-muted/30"></div>
            <div class="h-10 w-full rounded-md bg-muted/30"></div>
            <div class="h-10 w-full rounded-md bg-muted/30"></div>
          </nav>
          <div class="px-6 py-4 text-xs font-medium text-muted-foreground/60">禾风起工具箱</div>
        </aside>
        <main class="flex-1 overflow-auto bg-muted/10 p-6">
          <div class="mx-auto max-w-4xl">
            <div class="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div class="flex items-center gap-3">
                <svg width="16" height="16" class="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
                  <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
                </svg>
                <div class="text-sm font-medium">正在启动…</div>
              </div>
              <div class="mt-2 text-xs text-muted-foreground">
                正在启动后台服务并加载界面。首次启动/系统较慢/杀毒扫描时可能会多等一会儿。
              </div>
              <div class="mt-3 text-xs text-muted-foreground">
                日志：<span class="font-mono">{log_path_html}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </body>
</html>"""
        window_width = 1180
        window_height = 820
        window_x = None
        window_y = None
        if sys.platform == "win32":
            try:
                import ctypes

                user32 = ctypes.windll.user32
                screen_w = int(user32.GetSystemMetrics(0))
                screen_h = int(user32.GetSystemMetrics(1))
                window_x = max(0, (screen_w - window_width) // 2)
                window_y = max(0, (screen_h - window_height) // 2)
            except Exception:
                window_x = None
                window_y = None
        window = webview.create_window(
            PROJECT_NAME,
            html=loading_html,
            js_api=desktop_api,
            width=window_width,
            height=window_height,
            x=window_x,
            y=window_y,
            min_size=(980, 640),
            frameless=True,
            easy_drag=False,
        )
        desktop_api.bind(window)
        window.events.closing += lambda: stop_event.set()

        def bootstrap():
            try:
                deadline = monotonic() + 30
                while monotonic() < deadline and not stop_event.is_set():
                    if backend_errors:
                        break
                    if not thread.is_alive():
                        break
                    if _wait_http_ok(repository_url, timeout_s=1.0):
                        window.load_url(url)
                        return
                    sleep(0.2)

                reason = "后台服务启动超时"
                if backend_errors:
                    reason = backend_errors[-1].strip().splitlines()[-1]
                _log(f"desktop startup failed: {reason}")
                window.load_html(
                    f"""<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{PROJECT_NAME}</title>
    <style>
      {webui_css}
      html, body {{ height: 100%; margin: 0; }}
    </style>
  </head>
  <body>
    <div class="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <div class="flex h-7 shrink-0 items-center justify-between bg-background">
        <div class="pywebview-drag-region h-full flex-1" onmousedown="window.pywebview && window.pywebview.api && window.pywebview.api.begin_drag && window.pywebview.api.begin_drag()"></div>
        <div class="flex h-full items-center">
          <button type="button" class="h-full w-7 hover:bg-muted" onclick="window.pywebview && window.pywebview.api && window.pywebview.api.minimize && window.pywebview.api.minimize()" title="最小化">
            <span class="text-sm leading-none">—</span>
          </button>
          <button type="button" class="h-full w-7 hover:bg-muted" onclick="window.pywebview && window.pywebview.api && window.pywebview.api.toggle_maximize && window.pywebview.api.toggle_maximize()" title="最大化/还原">
            <span class="text-xs leading-none">□</span>
          </button>
          <button type="button" class="h-full w-7 hover:bg-destructive hover:text-destructive-foreground" onclick="window.pywebview && window.pywebview.api && window.pywebview.api.close && window.pywebview.api.close()" title="关闭">
            <span class="text-sm leading-none">×</span>
          </button>
        </div>
      </div>
      <div class="flex flex-1 overflow-hidden">
        <aside class="flex h-full w-64 flex-col bg-muted/30">
          <nav class="flex-1 space-y-2 px-4 pt-6 lg:pt-8"></nav>
          <div class="px-6 py-4 text-xs font-medium text-muted-foreground/60">禾风起工具箱</div>
        </aside>
        <main class="flex-1 overflow-auto bg-muted/10 p-6">
          <div class="mx-auto max-w-4xl">
            <div class="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <div class="text-sm font-semibold">启动失败</div>
              <div class="mt-2 text-xs text-muted-foreground">
                无法启动后台服务：<span class="font-mono text-foreground">{_escape_html(reason)}</span>
              </div>
              <div class="mt-3 text-xs text-muted-foreground">
                日志：<span class="font-mono">{log_path_html}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </body>
</html>"""
                )
                stop_event.set()
            except Exception:
                _log(traceback.format_exc().rstrip())
                _alert(f"{PROJECT_NAME}\n\n启动失败，请查看日志：{log_path}")
                stop_event.set()

        webview.start(bootstrap, gui="edgechromium")
    except Exception as e:
        try:
            fallback(f"创建桌面窗口失败：{e!r}")
        finally:
            stop_event.set()
            thread.join(timeout=3)
    else:
        stop_event.set()
        thread.join(timeout=3)
