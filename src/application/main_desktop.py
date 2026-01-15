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
    port = _pick_port(SERVER_PORT)
    stop_event = Event()

    def backend():
        from asyncio import run

        async def runner():
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

        run(runner())

    thread = Thread(
        target=backend,
        name="douk-webui-backend",
        daemon=True,
    )
    thread.start()

    base = f"http://127.0.0.1:{port}"
    if not _wait_http_ok(f"{base}/ui-api/repository", timeout_s=10):
        stop_event.set()
        return

    url = f"{base}/ui"
    import sys

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
        is_frozen = bool(getattr(sys, "frozen", False) or getattr(sys, "_MEIPASS", None))
        if is_frozen:
            message = (
                f"{PROJECT_NAME}\n\n"
                f"桌面窗口启动失败：{reason}\n\n"
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
            return

        print(f"[desktop] 已退回浏览器模式：{reason}")
        print(f"[desktop] 当前解释器：{sys.executable}")
        print(
            "[desktop] 若需要桌面窗口：先安装依赖 `uv pip install -r requirements.txt`，再用 `uv run python main.py` 或 `.venv\\Scripts\\python main.py` 启动"
        )
        print(
            "[desktop] 如仍无法弹窗：安装/修复 Microsoft Edge WebView2 Runtime（Windows 11 通常已自带）"
        )

        import webbrowser

        webbrowser.open(url)
        try:
            while thread.is_alive():
                sleep(0.5)
        except KeyboardInterrupt:
            pass

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

    try:
        window = webview.create_window(
            f"{PROJECT_NAME} (127.0.0.1:{port})",
            url,
            width=1180,
            height=820,
            min_size=(980, 640),
        )
        window.events.closing += lambda: stop_event.set()
        webview.start(gui="edgechromium")
    except Exception as e:
        try:
            fallback(f"创建桌面窗口失败：{e!r}")
        finally:
            stop_event.set()
            thread.join(timeout=3)
    else:
        stop_event.set()
        thread.join(timeout=3)
