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

    def fallback(reason: str) -> None:
        print(f"[desktop] 已退回浏览器模式：{reason}")
        print(f"[desktop] 当前解释器：{sys.executable}")
        print("[desktop] 若需要桌面窗口：先安装依赖 `uv pip install -r requirements.txt`，再用 `uv run python main.py` 或 `.venv\\Scripts\\python main.py` 启动")
        print("[desktop] 如仍无法弹窗：安装/修复 Microsoft Edge WebView2 Runtime（Windows 11 通常已自带）")

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
