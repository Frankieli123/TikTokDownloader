from __future__ import annotations

from asyncio import CancelledError, Lock, Queue, create_task, wait_for
from collections import deque
from dataclasses import dataclass, field
from json import dumps
from time import time
from typing import Any, Literal
from uuid import uuid4

from fastapi import Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ..custom import (
    DISCLAIMER_TEXT,
    PROJECT_NAME,
    RELEASES,
    REPOSITORY,
    VERSION_BETA,
    VERSION_MAJOR,
    VERSION_MINOR,
    __VERSION__,
)
from ..interface import API, Collection, Collects, CollectsMix, CollectsMusic
from ..module import Cookie, DetailTikTokExtractor, DetailTikTokUnofficial
from ..tools import Browser, cookie_dict_to_str, cookie_str_to_dict
from ..tools.progress import EventProgress
from ..translation import _
from .main_server import APIServer, token_dependency

__all__ = ["WebUIServer"]


class DownloadDetailTaskRequest(BaseModel):
    platform: Literal["douyin", "tiktok"] = "douyin"
    text: str = Field(min_length=1)
    cookie: str | None = None
    proxy: str | None = None


class DownloadAccountTaskRequest(BaseModel):
    platform: Literal["douyin", "tiktok"] = "douyin"
    text: str = Field(min_length=1)
    tab: str = "post"
    earliest: str | int | float | None = None
    latest: str | int | float | None = None
    pages: int | None = None
    mark: str = ""
    cookie: str | None = None
    proxy: str | None = None


class DownloadMixTaskRequest(BaseModel):
    platform: Literal["douyin", "tiktok"] = "douyin"
    text: str = Field(min_length=1)
    mark: str = ""
    cookie: str | None = None
    proxy: str | None = None


class DownloadCollectionTaskRequest(BaseModel):
    cookie: str | None = None
    proxy: str | None = None


class CollectsItem(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)


class DownloadCollectsTaskRequest(BaseModel):
    items: list[CollectsItem] = Field(min_length=1)
    cookie: str | None = None
    proxy: str | None = None


class MixCollectionItem(BaseModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)


class DownloadMixCollectionTaskRequest(BaseModel):
    items: list[MixCollectionItem] = Field(min_length=1)
    mark: str = ""
    cookie: str | None = None
    proxy: str | None = None


class DownloadCollectionMusicTaskRequest(BaseModel):
    cookie: str | None = None
    proxy: str | None = None


class DownloadTikTokOriginalTaskRequest(BaseModel):
    text: str = Field(min_length=1)
    proxy: str | None = None


class CollectLiveTaskRequest(BaseModel):
    platform: Literal["douyin", "tiktok"] = "douyin"
    text: str = Field(min_length=1)
    download: bool = False
    quality: str | None = None
    cookie: str | None = None
    proxy: str | None = None


class CollectCommentTaskRequest(BaseModel):
    text: str = Field(min_length=1)
    pages: int = Field(1, gt=0)
    cursor: int = 0
    count: int = Field(20, gt=0)
    count_reply: int = Field(3, gt=0)
    reply: bool = False
    cookie: str | None = None
    proxy: str | None = None


class CollectUserDataTaskRequest(BaseModel):
    text: str = Field(min_length=1)
    cookie: str | None = None
    proxy: str | None = None


class CollectHotTaskRequest(BaseModel):
    cookie: str | None = None
    proxy: str | None = None


class CollectSearchTaskRequest(BaseModel):
    mode: Literal["general", "video", "user", "live"] = "general"
    keyword: str = Field(min_length=1)
    pages: int = Field(1, gt=0)
    offset: int = Field(0, ge=0)
    count: int = Field(10, ge=5)
    sort_type: int = 0
    publish_time: int = 0
    duration: int = 0
    search_range: int = 0
    content_type: int = 0
    douyin_user_fans: int = 0
    douyin_user_type: int = 0
    cookie: str | None = None
    proxy: str | None = None


class UIConfigUpdateRequest(BaseModel):
    record: bool | None = None
    logger: bool | None = None


class DownloadRecordDeleteRequest(BaseModel):
    ids: str = Field(min_length=1)


class CookieImportClipboardRequest(BaseModel):
    platform: Literal["douyin", "tiktok"] = "douyin"


class CookieImportBrowserRequest(BaseModel):
    platform: Literal["douyin", "tiktok"] = "douyin"
    browser: str | None = None


def _split_inputs(text: str) -> list[str]:
    return [i for i in text.replace("\r", "\n").split() if i]


@dataclass(slots=True)
class UITask:
    id: str
    type: str
    title: str
    status: str = "queued"
    created_at: float = field(default_factory=time)
    started_at: float | None = None
    finished_at: float | None = None
    error: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)
    events: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=2000))
    subscribers: set[Queue[dict[str, Any]]] = field(default_factory=set)

    def snapshot(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "status": self.status,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "error": self.error,
            "meta": self.meta,
        }

    def emit(self, event: dict[str, Any]) -> None:
        event = {"ts": time(), **event}
        self.events.append(event)
        for queue in list(self.subscribers):
            try:
                queue.put_nowait(event)
            except Exception:
                self.subscribers.discard(queue)


class UITaskManager:
    def __init__(self):
        self._tasks: dict[str, UITask] = {}

    def list(self) -> list[dict[str, Any]]:
        return [t.snapshot() for t in reversed(list(self._tasks.values()))]

    def get(self, task_id: str) -> UITask:
        try:
            return self._tasks[task_id]
        except KeyError:
            raise HTTPException(status_code=404, detail="task not found") from None

    def create(self, task_type: str, title: str) -> UITask:
        task_id = uuid4().hex
        task = UITask(
            id=task_id,
            type=task_type,
            title=title,
        )
        self._tasks[task_id] = task
        task.emit({"type": "task.created"})
        return task

    def run(self, task: UITask, coro) -> None:
        async def runner():
            task.status = "running"
            task.started_at = time()
            task.emit({"type": "task.started"})
            try:
                await coro
                task.status = "success"
                task.emit({"type": "task.succeeded"})
            except CancelledError:
                task.status = "cancelled"
                task.emit({"type": "task.cancelled"})
                raise
            except Exception as e:
                task.status = "error"
                task.error = repr(e)
                task.emit({"type": "task.failed", "error": task.error})
            finally:
                task.finished_at = time()
                task.emit({"type": "task.finished"})

        create_task(runner())


class WebUIServer(APIServer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.ui_tasks = UITaskManager()
        self._ui_task_lock = Lock()
        self._clipboard_monitor = None
        self._clipboard_monitor_task = None

    def setup_routes(self):
        super().setup_routes()
        self._setup_ui_routes()
        self._setup_ui_api_routes()

    def _setup_ui_routes(self):
        webui_root = self._get_app_root().joinpath("static", "webui")
        webui_assets = webui_root.joinpath("assets")
        index_html = webui_root.joinpath("index.html")

        if webui_assets.exists():
            self.server.mount(
                "/ui/assets",
                StaticFiles(directory=webui_assets),
                name="ui-assets",
            )

        @self.server.get(
            "/ui",
            include_in_schema=False,
        )
        async def ui_index():
            if not index_html.exists():
                raise HTTPException(
                    status_code=500,
                    detail="Web UI is not built. Run `npm install` and `npm run build` under `webui/`.",
                )
            return FileResponse(index_html)

        @self.server.get(
            "/ui/{path:path}",
            include_in_schema=False,
        )
        async def ui_fallback(path: str):
            if not index_html.exists():
                raise HTTPException(
                    status_code=500,
                    detail="Web UI is not built. Run `npm install` and `npm run build` under `webui/`.",
                )
            file_ = webui_root.joinpath(path)
            try:
                if (
                    file_.exists()
                    and file_.is_file()
                    and file_.resolve().is_relative_to(webui_root.resolve())
                ):
                    return FileResponse(file_)
            except Exception:
                pass
            return FileResponse(index_html)

        @self.server.get(
            "/ui-api/repository",
            tags=["WebUI"],
        )
        async def ui_repository():
            return {"repository": REPOSITORY}

    @staticmethod
    def _get_app_root():
        from pathlib import Path
        import sys

        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            return Path(meipass)
        return Path(__file__).resolve().parent.parent.parent

    def _setup_ui_api_routes(self):
        def _platform_cookie_key(platform: str) -> str:
            return "cookie_tiktok" if platform == "tiktok" else "cookie"

        def _platform_domains(platform: str) -> list[str]:
            return ["tiktok.com"] if platform == "tiktok" else ["douyin.com"]

        @self.server.get(
            "/ui-api/app",
            tags=["WebUI"],
        )
        async def ui_app(token: str = Depends(token_dependency)):
            config = await self.database.read_config_data()
            config = {i["NAME"]: i["VALUE"] for i in config}
            return {
                "name": PROJECT_NAME,
                "version": __VERSION__,
                "disclaimer_accepted": bool(config.get("Disclaimer", 0)),
                "disclaimer_text": _(DISCLAIMER_TEXT),
                "record": bool(config.get("Record", 1)),
                "logger": bool(config.get("Logger", 0)),
            }

        @self.server.post(
            "/ui-api/disclaimer/accept",
            tags=["WebUI"],
        )
        async def ui_accept_disclaimer(token: str = Depends(token_dependency)):
            await self.database.update_config_data("Disclaimer", 1)
            return {"ok": True}

        @self.server.get(
            "/ui-api/config",
            tags=["WebUI"],
        )
        async def ui_get_config(token: str = Depends(token_dependency)):
            config = await self.database.read_config_data()
            config = {i["NAME"]: i["VALUE"] for i in config}
            return {
                "record": bool(config.get("Record", 1)),
                "logger": bool(config.get("Logger", 0)),
                "disclaimer_accepted": bool(config.get("Disclaimer", 0)),
            }

        @self.server.post(
            "/ui-api/config",
            tags=["WebUI"],
        )
        async def ui_update_config(
            extract: UIConfigUpdateRequest,
            token: str = Depends(token_dependency),
        ):
            if extract.record is not None:
                await self.database.update_config_data("Record", int(extract.record))
            if extract.logger is not None:
                await self.database.update_config_data("Logger", int(extract.logger))
            return await ui_get_config(token)

        @self.server.post(
            "/ui-api/recorder/delete",
            tags=["WebUI"],
        )
        async def ui_delete_download_records(
            extract: DownloadRecordDeleteRequest,
            token: str = Depends(token_dependency),
        ):
            async with self._ui_task_lock:
                ids = (extract.ids or "").strip()
                if not ids:
                    raise HTTPException(status_code=400, detail="ids is required")
                await self.parameter.recorder.delete_ids(ids)
                return {"ok": True}

        @self.server.get(
            "/ui-api/update/check",
            tags=["WebUI"],
        )
        async def ui_check_update(token: str = Depends(token_dependency)):
            import httpx

            try:
                response = httpx.get(
                    RELEASES,
                    timeout=5,
                    follow_redirects=True,
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"check update failed: {e!r}") from None

            try:
                latest_major, latest_minor = map(
                    int, str(response.url).split("/")[-1].split(".", 1)
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"parse update version failed: {e!r}") from None

            update_available = latest_major > VERSION_MAJOR or latest_minor > VERSION_MINOR
            if not update_available and VERSION_BETA and latest_minor == VERSION_MINOR:
                update_available = True

            return {
                "current_version": __VERSION__,
                "current_major": VERSION_MAJOR,
                "current_minor": VERSION_MINOR,
                "current_beta": bool(VERSION_BETA),
                "latest_major": latest_major,
                "latest_minor": latest_minor,
                "latest_version": f"{latest_major}.{latest_minor}",
                "update_available": bool(update_available),
                "releases_url": RELEASES,
            }

        @self.server.get(
            "/ui-api/monitor/clipboard",
            tags=["WebUI"],
        )
        async def ui_clipboard_monitor_status(token: str = Depends(token_dependency)):
            task = self._clipboard_monitor_task
            return {"running": bool(task and not task.done())}

        @self.server.post(
            "/ui-api/monitor/clipboard/start",
            tags=["WebUI"],
        )
        async def ui_clipboard_monitor_start(token: str = Depends(token_dependency)):
            task = self._clipboard_monitor_task
            if task and not task.done():
                return {"running": True}

            from .main_monitor import ClipboardMonitor

            monitor = ClipboardMonitor(
                self.parameter,
                self.database,
                server_mode=True,
            )
            self._clipboard_monitor = monitor
            self._clipboard_monitor_task = create_task(
                monitor.start_listener(
                    delay=1,
                    reset_clipboard=False,
                )
            )
            return {"running": True}

        @self.server.post(
            "/ui-api/monitor/clipboard/stop",
            tags=["WebUI"],
        )
        async def ui_clipboard_monitor_stop(token: str = Depends(token_dependency)):
            monitor = self._clipboard_monitor
            task = self._clipboard_monitor_task

            if monitor:
                try:
                    await monitor.stop_listener()
                except Exception:
                    pass

            if task and not task.done():
                try:
                    await wait_for(task, timeout=2)
                except Exception:
                    pass

            self._clipboard_monitor = None
            self._clipboard_monitor_task = None
            return {"running": False}

        @self.server.post(
            "/ui-api/cookie/import/clipboard",
            tags=["WebUI"],
        )
        async def ui_import_cookie_from_clipboard(
            extract: CookieImportClipboardRequest,
            token: str = Depends(token_dependency),
        ):
            from pyperclip import paste

            async with self._ui_task_lock:
                try:
                    raw_cookie = paste() or ""
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"无法读取剪贴板：{e}") from None

                if not Cookie.validate_cookie_minimal(raw_cookie):
                    raise HTTPException(
                        status_code=400,
                        detail="剪贴板内容不是有效的 Cookie 字符串，请先复制 Cookie 后再试",
                    )

                cookie_dict = cookie_str_to_dict(raw_cookie)
                key = _platform_cookie_key(extract.platform)
                await self.parameter.set_settings_data({key: cookie_dict})
                await self.parameter.update_params_offline()

                return {
                    "platform": extract.platform,
                    "cookie": cookie_dict_to_str(cookie_dict),
                    "logged_in": bool(cookie_dict.get(Cookie.STATE_KEY)),
                }

        @self.server.get(
            "/ui-api/cookie/browsers",
            tags=["WebUI"],
        )
        async def ui_list_cookie_browsers(token: str = Depends(token_dependency)):
            return {
                "browsers": [
                    {"name": name, "support": support}
                    for name, (_, support) in Browser.SUPPORT_BROWSER.items()
                ]
            }

        @self.server.post(
            "/ui-api/cookie/import/browser",
            tags=["WebUI"],
        )
        async def ui_import_cookie_from_browser(
            extract: CookieImportBrowserRequest,
            token: str = Depends(token_dependency),
        ):
            async with self._ui_task_lock:
                domains = _platform_domains(extract.platform)

                def try_read(name: str) -> dict[str, str]:
                    fn = Browser.SUPPORT_BROWSER[name][0]
                    try:
                        cookies = fn(domains=domains)
                        return {i.get("name"): i.get("value") for i in cookies if i.get("name")}
                    except RuntimeError:
                        return {}
                    except Exception:
                        return {}

                chosen: str | None = None
                cookie_dict: dict[str, str] = {}

                if extract.browser:
                    raw = extract.browser.strip()
                    if raw:
                        name = None
                        try:
                            index = int(raw) - 1
                        except ValueError:
                            index = None
                        if index is not None:
                            names = list(Browser.SUPPORT_BROWSER.keys())
                            if 0 <= index < len(names):
                                name = names[index]
                        else:
                            raw_lower = raw.lower()
                            for candidate in Browser.SUPPORT_BROWSER.keys():
                                if candidate.lower() == raw_lower:
                                    name = candidate
                                    break
                        if not name:
                            raise HTTPException(
                                status_code=400,
                                detail="未识别的浏览器名称/序号，请从“支持的浏览器”列表中选择",
                            )
                        chosen = name
                        cookie_dict = try_read(name)
                else:
                    preferred = [
                        "Edge",
                        "Chrome",
                        "Chromium",
                        "Brave",
                        "Vivaldi",
                        "Opera",
                        "OperaGX",
                        "Firefox",
                        "LibreWolf",
                        "Arc",
                    ]
                    for name in preferred:
                        if name not in Browser.SUPPORT_BROWSER:
                            continue
                        cookie_dict = try_read(name)
                        if cookie_dict:
                            chosen = name
                            break

                if not cookie_dict:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "未从浏览器读取到 Cookie。"
                            "Windows 上读取 Chromium/Chrome/Edge 的 Cookie 通常需要以管理员身份运行程序。"
                        ),
                    )

                key = _platform_cookie_key(extract.platform)
                await self.parameter.set_settings_data({key: cookie_dict})
                await self.parameter.update_params_offline()

                return {
                    "platform": extract.platform,
                    "browser": chosen,
                    "cookie": cookie_dict_to_str(cookie_dict),
                    "logged_in": bool(cookie_dict.get(Cookie.STATE_KEY)),
                }

        @self.server.get(
            "/ui-api/tasks",
            tags=["WebUI"],
        )
        async def list_tasks(token: str = Depends(token_dependency)):
            return {"tasks": self.ui_tasks.list()}

        @self.server.get(
            "/ui-api/tasks/{task_id}",
            tags=["WebUI"],
        )
        async def get_task(task_id: str, token: str = Depends(token_dependency)):
            return self.ui_tasks.get(task_id).snapshot()

        @self.server.get(
            "/ui-api/tasks/{task_id}/events",
            tags=["WebUI"],
        )
        async def task_events(task_id: str, token: str = Depends(token_dependency)):
            task = self.ui_tasks.get(task_id)
            queue: Queue[dict[str, Any]] = Queue(maxsize=200)
            task.subscribers.add(queue)

            async def gen():
                try:
                    for e in list(task.events):
                        yield f"data: {dumps(e, ensure_ascii=False)}\n\n"
                    while True:
                        try:
                            e = await wait_for(queue.get(), timeout=10)
                            yield f"data: {dumps(e, ensure_ascii=False)}\n\n"
                        except TimeoutError:
                            yield ": ping\n\n"
                finally:
                    task.subscribers.discard(queue)

            return StreamingResponse(gen(), media_type="text/event-stream")

        @self.server.get(
            "/ui-api/douyin/collects",
            tags=["WebUI"],
        )
        async def list_douyin_collects(token: str = Depends(token_dependency)):
            async with self._ui_task_lock:
                if not self.parameter.cookie_state:
                    raise HTTPException(
                        status_code=400, detail="Douyin cookie is not configured"
                    )
                data = await Collects(self.parameter).run()
                if not any(data):
                    return {"collects": []}
                return {"collects": self.extractor.extract_collects_info(data)}

        @self.server.get(
            "/ui-api/douyin/mix-collections",
            tags=["WebUI"],
        )
        async def list_douyin_mix_collections(token: str = Depends(token_dependency)):
            async with self._ui_task_lock:
                if not self.parameter.cookie_state:
                    raise HTTPException(
                        status_code=400, detail="Douyin cookie is not configured"
                    )
                data = await CollectsMix(self.parameter).run()
                if not any(data):
                    return {"mix_collections": []}
                return {"mix_collections": self.extractor.extract_mix_collect_info(data)}

        @self.server.post(
            "/ui-api/tasks/collect/live",
            tags=["WebUI"],
        )
        async def create_collect_live_task(
            extract: CollectLiveTaskRequest,
            token: str = Depends(token_dependency),
        ):
            tiktok = extract.platform == "tiktok"
            title = _("获取直播拉流地址") + (" (TikTok)" if tiktok else " (抖音)")
            task = self.ui_tasks.create("collect.live", title)
            self.ui_tasks.run(
                task,
                self._run_collect_live_task(
                    task,
                    tiktok=tiktok,
                    text=extract.text,
                    download=extract.download,
                    quality=extract.quality,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/collect/comment",
            tags=["WebUI"],
        )
        async def create_collect_comment_task(
            extract: CollectCommentTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("采集作品评论数据") + " (抖音)"
            task = self.ui_tasks.create("collect.comment", title)
            self.ui_tasks.run(
                task,
                self._run_collect_comment_task(
                    task,
                    text=extract.text,
                    pages=extract.pages,
                    cursor=extract.cursor,
                    count=extract.count,
                    count_reply=extract.count_reply,
                    reply=extract.reply,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/collect/user-data",
            tags=["WebUI"],
        )
        async def create_collect_user_data_task(
            extract: CollectUserDataTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("采集账号详细数据") + " (抖音)"
            task = self.ui_tasks.create("collect.user", title)
            self.ui_tasks.run(
                task,
                self._run_collect_user_data_task(
                    task,
                    text=extract.text,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/collect/hot",
            tags=["WebUI"],
        )
        async def create_collect_hot_task(
            extract: CollectHotTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("采集抖音热榜数据") + " (抖音)"
            task = self.ui_tasks.create("collect.hot", title)
            self.ui_tasks.run(
                task,
                self._run_collect_hot_task(
                    task,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/collect/search",
            tags=["WebUI"],
        )
        async def create_collect_search_task(
            extract: CollectSearchTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("采集搜索结果数据") + " (抖音)"
            task = self.ui_tasks.create("collect.search", title)
            self.ui_tasks.run(
                task,
                self._run_collect_search_task(
                    task,
                    mode=extract.mode,
                    keyword=extract.keyword,
                    pages=extract.pages,
                    offset=extract.offset,
                    count=extract.count,
                    sort_type=extract.sort_type,
                    publish_time=extract.publish_time,
                    duration=extract.duration,
                    search_range=extract.search_range,
                    content_type=extract.content_type,
                    douyin_user_fans=extract.douyin_user_fans,
                    douyin_user_type=extract.douyin_user_type,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/detail",
            tags=["WebUI"],
        )
        async def create_download_detail_task(
            extract: DownloadDetailTaskRequest,
            token: str = Depends(token_dependency),
        ):
            tiktok = extract.platform == "tiktok"
            title = _("批量下载链接作品") + (" (TikTok)" if tiktok else " (抖音)")
            task = self.ui_tasks.create("download.detail", title)
            self.ui_tasks.run(
                task,
                self._run_download_detail_task(
                    task,
                    tiktok=tiktok,
                    text=extract.text,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/account",
            tags=["WebUI"],
        )
        async def create_download_account_task(
            extract: DownloadAccountTaskRequest,
            token: str = Depends(token_dependency),
        ):
            tiktok = extract.platform == "tiktok"
            title = _("批量下载账号作品") + (" (TikTok)" if tiktok else " (抖音)")
            task = self.ui_tasks.create("download.account", title)
            self.ui_tasks.run(
                task,
                self._run_download_account_task(
                    task,
                    tiktok=tiktok,
                    text=extract.text,
                    tab=extract.tab,
                    earliest=extract.earliest,
                    latest=extract.latest,
                    pages=extract.pages,
                    mark=extract.mark,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/mix",
            tags=["WebUI"],
        )
        async def create_download_mix_task(
            extract: DownloadMixTaskRequest,
            token: str = Depends(token_dependency),
        ):
            tiktok = extract.platform == "tiktok"
            title = _("批量下载合集作品") + (" (TikTok)" if tiktok else " (抖音)")
            task = self.ui_tasks.create("download.mix", title)
            self.ui_tasks.run(
                task,
                self._run_download_mix_task(
                    task,
                    tiktok=tiktok,
                    text=extract.text,
                    mark=extract.mark,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/collection",
            tags=["WebUI"],
        )
        async def create_download_collection_task(
            extract: DownloadCollectionTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("批量下载收藏作品") + " (抖音)"
            task = self.ui_tasks.create("download.collection", title)
            self.ui_tasks.run(
                task,
                self._run_download_collection_task(
                    task,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/collects",
            tags=["WebUI"],
        )
        async def create_download_collects_task(
            extract: DownloadCollectsTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("批量下载收藏夹作品") + " (抖音)"
            task = self.ui_tasks.create("download.collects", title)
            self.ui_tasks.run(
                task,
                self._run_download_collects_task(
                    task,
                    items=extract.items,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/collection_music",
            tags=["WebUI"],
        )
        async def create_download_collection_music_task(
            extract: DownloadCollectionMusicTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("批量下载收藏音乐") + " (抖音)"
            task = self.ui_tasks.create("download.collection_music", title)
            self.ui_tasks.run(
                task,
                self._run_download_collection_music_task(
                    task,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/mix_collection",
            tags=["WebUI"],
        )
        async def create_download_mix_collection_task(
            extract: DownloadMixCollectionTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("批量下载收藏合集作品") + " (抖音)"
            task = self.ui_tasks.create("download.mix_collection", title)
            self.ui_tasks.run(
                task,
                self._run_download_mix_collection_task(
                    task,
                    items=extract.items,
                    mark=extract.mark,
                    cookie=extract.cookie,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

        @self.server.post(
            "/ui-api/tasks/download/tiktok_original",
            tags=["WebUI"],
        )
        async def create_download_tiktok_original_task(
            extract: DownloadTikTokOriginalTaskRequest,
            token: str = Depends(token_dependency),
        ):
            title = _("批量下载视频原画") + " (TikTok)"
            task = self.ui_tasks.create("download.tiktok_original", title)
            self.ui_tasks.run(
                task,
                self._run_download_tiktok_original_task(
                    task,
                    text=extract.text,
                    proxy=extract.proxy,
                ),
            )
            return task.snapshot()

    async def _run_download_detail_task(
        self,
        task: UITask,
        *,
        tiktok: bool,
        text: str,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            task.emit({"type": "phase", "name": "extract_ids"})
            link_obj = self.links_tiktok if tiktok else self.links
            ids = await link_obj.run(text, proxy=proxy)
            ids = [i for i in ids if i]
            task.meta["works_count"] = len(ids)
            task.emit({"type": "meta", **task.meta})
            if not ids:
                raise ValueError("no works extracted")

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                root, params, logger = self.record.run(self.parameter)
                async with logger(root, console=self.console, **params) as record:
                    task.emit({"type": "phase", "name": "download"})
                    await self._handle_detail(
                        ids,
                        tiktok,
                        record,
                        False,
                        False,
                        cookie=cookie,
                        proxy=proxy,
                    )
            finally:
                self.downloader.general_progress_object = original_progress

    async def _run_download_account_task(
        self,
        task: UITask,
        *,
        tiktok: bool,
        text: str,
        tab: str,
        earliest: str | int | float | None,
        latest: str | int | float | None,
        pages: int | None,
        mark: str,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            task.emit({"type": "phase", "name": "extract_accounts"})
            link_obj = self.links_tiktok if tiktok else self.links
            sec_user_ids = await link_obj.run(text, type_="user", proxy=proxy)
            sec_user_ids = [i for i in sec_user_ids if i]
            task.meta["accounts_count"] = len(sec_user_ids)
            task.emit({"type": "meta", **task.meta})
            if not sec_user_ids:
                raise ValueError("no accounts extracted")

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                for index, sec_user_id in enumerate(sec_user_ids, start=1):
                    task.emit(
                        {
                            "type": "account.start",
                            "index": index,
                            "total": len(sec_user_ids),
                            "sec_user_id": sec_user_id,
                            "tab": tab,
                        }
                    )
                    ok = await self.deal_account_detail(
                        index,
                        sec_user_id,
                        mark=mark,
                        tab=tab,
                        earliest=earliest or "",
                        latest=latest or "",
                        pages=pages,
                        api=False,
                        source=False,
                        cookie=cookie,
                        proxy=proxy,
                        tiktok=tiktok,
                    )
                    task.emit(
                        {
                            "type": "account.done",
                            "index": index,
                            "total": len(sec_user_ids),
                            "sec_user_id": sec_user_id,
                            "ok": bool(ok),
                        }
                    )
            finally:
                self.downloader.general_progress_object = original_progress

    async def _run_download_mix_task(
        self,
        task: UITask,
        *,
        tiktok: bool,
        text: str,
        mark: str,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            urls = _split_inputs(text)
            if not urls:
                raise ValueError("no mix links")
            task.meta["mix_count"] = len(urls)
            task.emit({"type": "meta", **task.meta})

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                for index, url in enumerate(urls, start=1):
                    task.emit({"type": "mix.start", "index": index, "total": len(urls)})
                    mix_id, id_, title = await self._check_mix_id(url, tiktok)
                    if not id_:
                        task.emit(
                            {
                                "type": "mix.done",
                                "index": index,
                                "total": len(urls),
                                "url": url,
                                "ok": False,
                            }
                        )
                        continue
                    ok = await self.deal_mix_detail(
                        mix_id,
                        id_,
                        mark=mark,
                        index=index,
                        api=False,
                        source=False,
                        cookie=cookie,
                        proxy=proxy,
                        tiktok=tiktok,
                        mix_title=title,
                    )
                    task.emit(
                        {
                            "type": "mix.done",
                            "index": index,
                            "total": len(urls),
                            "url": url,
                            "mix_id": id_,
                            "ok": bool(ok),
                        }
                    )
            finally:
                self.downloader.general_progress_object = original_progress

    async def _run_download_collection_task(
        self,
        task: UITask,
        *,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not (cookie or self.parameter.cookie_state):
                raise ValueError("douyin cookie is not configured")
            owner_url = getattr(self.parameter.owner_url, "url", "")
            if not owner_url:
                raise ValueError("owner_url is not configured")

            task.emit({"type": "phase", "name": "resolve_owner"})
            sec_user_id = await self.check_sec_user_id(owner_url)
            if not sec_user_id:
                raise ValueError("owner_url is invalid")
            task.meta["sec_user_id"] = sec_user_id
            task.emit({"type": "meta", **task.meta})

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                task.emit({"type": "phase", "name": "fetch_user_info"})
                info = await self.get_user_info_data(
                    False,
                    cookie,
                    proxy,
                    sec_user_id=sec_user_id,
                )
                if not info:
                    raise ValueError("fetch owner info failed")

                task.emit({"type": "phase", "name": "fetch_collection"})
                collection = await Collection(
                    self.parameter,
                    cookie or "",
                    proxy,
                    sec_user_id,
                ).run()
                if not any(collection):
                    raise ValueError("no collection data")

                task.emit({"type": "phase", "name": "download"})
                ok = await self._batch_process_detail(
                    collection,
                    api=False,
                    tiktok=False,
                    mode="collection",
                    mark=getattr(self.parameter.owner_url, "mark", ""),
                    user_id=sec_user_id,
                    info=info,
                )
                task.emit({"type": "collection.done", "ok": bool(ok)})
            finally:
                self.downloader.general_progress_object = original_progress

    async def _run_download_collects_task(
        self,
        task: UITask,
        *,
        items: list[CollectsItem],
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not (cookie or self.parameter.cookie_state):
                raise ValueError("douyin cookie is not configured")
            task.meta["collects_count"] = len(items)
            task.emit({"type": "meta", **task.meta})
            if not items:
                raise ValueError("no collects selected")

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                for index, item in enumerate(items, start=1):
                    task.emit(
                        {
                            "type": "collects.start",
                            "index": index,
                            "total": len(items),
                            "id": item.id,
                            "name": item.name,
                        }
                    )
                    ok = await self._deal_collects_data(
                        item.name,
                        item.id,
                        api=False,
                        source=False,
                        cookie=cookie,
                        proxy=proxy,
                        tiktok=False,
                    )
                    task.emit(
                        {
                            "type": "collects.done",
                            "index": index,
                            "total": len(items),
                            "id": item.id,
                            "ok": bool(ok),
                        }
                    )
            finally:
                self.downloader.general_progress_object = original_progress

    async def _run_download_collection_music_task(
        self,
        task: UITask,
        *,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not (cookie or self.parameter.cookie_state):
                raise ValueError("douyin cookie is not configured")

            task.emit({"type": "phase", "name": "fetch_music"})
            data = await CollectsMusic(self.parameter, cookie or "", proxy).run()
            if not any(data):
                raise ValueError("no music collected")
            task.meta["music_count"] = len(data)
            task.emit({"type": "meta", **task.meta})

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                task.emit({"type": "phase", "name": "download"})
                extracted = await self.extractor.run(
                    data,
                    None,
                    "music",
                )
                await self.downloader.run(extracted, type_="music")
            finally:
                self.downloader.general_progress_object = original_progress

    async def _run_download_mix_collection_task(
        self,
        task: UITask,
        *,
        items: list[MixCollectionItem],
        mark: str,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not (cookie or self.parameter.cookie_state):
                raise ValueError("douyin cookie is not configured")
            task.meta["mix_count"] = len(items)
            task.emit({"type": "meta", **task.meta})
            if not items:
                raise ValueError("no mix collections selected")

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                for index, item in enumerate(items, start=1):
                    task.emit(
                        {
                            "type": "mix_collection.start",
                            "index": index,
                            "total": len(items),
                            "id": item.id,
                            "title": item.title,
                        }
                    )
                    ok = await self.deal_mix_detail(
                        True,
                        item.id,
                        mark=mark,
                        index=index,
                        api=False,
                        source=False,
                        cookie=cookie,
                        proxy=proxy,
                        tiktok=False,
                        mix_title=item.title,
                    )
                    task.emit(
                        {
                            "type": "mix_collection.done",
                            "index": index,
                            "total": len(items),
                            "id": item.id,
                            "ok": bool(ok),
                        }
                    )
            finally:
                self.downloader.general_progress_object = original_progress

    async def _run_download_tiktok_original_task(
        self,
        task: UITask,
        *,
        text: str,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            task.emit({"type": "phase", "name": "extract_ids"})
            ids = await self.links_tiktok.run(text, proxy=proxy)
            ids = [i for i in ids if i]
            task.meta["works_count"] = len(ids)
            task.emit({"type": "meta", **task.meta})
            if not ids:
                raise ValueError("no works extracted")

            original_progress = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                extractor = DetailTikTokExtractor(self.parameter)
                for index, i in enumerate(ids, start=1):
                    task.emit(
                        {"type": "detail.start", "index": index, "total": len(ids), "id": i}
                    )
                    if data := await DetailTikTokUnofficial(
                        self.parameter,
                        proxy=proxy,
                        detail_id=i,
                    ).run():
                        if item := extractor.run(data):
                            await self.downloader.run([item], "detail", tiktok=True)
                            task.emit(
                                {
                                    "type": "detail.done",
                                    "index": index,
                                    "total": len(ids),
                                    "id": i,
                                    "ok": True,
                                }
                            )
                            continue
                    task.emit(
                        {
                            "type": "detail.done",
                            "index": index,
                            "total": len(ids),
                            "id": i,
                            "ok": False,
                        }
                    )
            finally:
                self.downloader.general_progress_object = original_progress

    @staticmethod
    def _patch_api_progress(task: UITask):
        original = getattr(API, "_progress_factory", None)
        API._progress_factory = lambda: EventProgress(
            task.emit,
            throttle_ms=200,
            id_prefix=f"{uuid4().hex}:",
        )
        return original

    @staticmethod
    def _restore_api_progress(original):
        API._progress_factory = original

    @staticmethod
    def _select_quality(
        flv_items: dict,
        m3u8_items: dict,
        preferred: str | None,
    ) -> tuple[str, str | None] | None:
        if not flv_items:
            return None
        if preferred:
            if preferred in flv_items:
                return flv_items[preferred], m3u8_items.get(preferred)
            try:
                idx = int(preferred) - 1
                if 0 <= idx < len(flv_items):
                    key = list(flv_items.keys())[idx]
                    return flv_items[key], m3u8_items.get(key)
            except Exception:
                pass
        key = next(iter(flv_items.keys()))
        return flv_items[key], m3u8_items.get(key)

    async def _run_collect_live_task(
        self,
        task: UITask,
        *,
        tiktok: bool,
        text: str,
        download: bool,
        quality: str | None,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            task.emit({"type": "phase", "name": "extract_live_ids"})
            link_obj = self.links_tiktok if tiktok else self.links
            ids = await link_obj.run(text, type_="live", proxy=proxy)
            ids = [i for i in ids if i]
            task.meta["live_count"] = len(ids)
            task.emit({"type": "meta", **task.meta})
            if not ids:
                raise ValueError("no live ids extracted")

            original_api = self._patch_api_progress(task)
            original_dl = self.downloader.general_progress_object
            self.downloader.general_progress_object = lambda: EventProgress(
                task.emit,
                throttle_ms=200,
                id_prefix=f"{uuid4().hex}:",
            )
            try:
                task.emit({"type": "phase", "name": "fetch_live_data"})
                getter = self.get_live_data_tiktok if tiktok else self.get_live_data
                live_data = [await getter(i, cookie=cookie, proxy=proxy) for i in ids]
                live_data = [i for i in live_data if i]
                if not live_data:
                    raise ValueError("fetch live data failed")

                task.emit({"type": "phase", "name": "extract"})
                extracted = await self.extractor.run(
                    live_data,
                    None,
                    "live",
                    tiktok=tiktok,
                )
                extracted = [i for i in extracted if i]
                task.meta["items"] = len(extracted)
                task.emit({"type": "meta", **task.meta})
                if not extracted:
                    raise ValueError("extract live data failed")

                for index, item in enumerate(extracted, start=1):
                    task.emit(
                        {
                            "type": "live.item",
                            "index": index,
                            "total": len(extracted),
                            "title": item.get("title"),
                            "nickname": item.get("nickname"),
                            "status": item.get("status"),
                            "flv_pull_url": item.get("flv_pull_url"),
                            "hls_pull_url_map": item.get("hls_pull_url_map"),
                        }
                    )

                should_download = bool(download and self.parameter.download)
                if not should_download:
                    return
                if not getattr(self, "ffmpeg", False):
                    task.emit({"type": "warn", "message": "ffmpeg unavailable, skip download"})
                    return

                task.emit({"type": "phase", "name": "download"})
                preferred = quality or self.parameter.live_qualities
                download_tasks = []
                for item in extracted:
                    if item.get("status") == 4:
                        continue
                    pair = self._select_quality(
                        item.get("flv_pull_url") or {},
                        item.get("hls_pull_url_map") or {},
                        preferred,
                    )
                    if not pair:
                        continue
                    flv_url, m3u8_url = pair
                    download_tasks.append((item, flv_url, m3u8_url or flv_url))
                if not download_tasks:
                    task.emit({"type": "warn", "message": "no downloadable live streams"})
                    return
                await self.downloader.run(download_tasks, type_="live", tiktok=tiktok)
            finally:
                self._restore_api_progress(original_api)
                self.downloader.general_progress_object = original_dl

    async def _run_collect_comment_task(
        self,
        task: UITask,
        *,
        text: str,
        pages: int,
        cursor: int,
        count: int,
        count_reply: int,
        reply: bool,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not self.parameter.storage_format:
                raise ValueError("storage_format is not configured")

            task.emit({"type": "phase", "name": "extract_ids"})
            ids = await self.links.run(text, proxy=proxy)
            ids = [i for i in ids if i]
            task.meta["works_count"] = len(ids)
            task.emit({"type": "meta", **task.meta})
            if not ids:
                raise ValueError("no works extracted")

            original_api = self._patch_api_progress(task)
            try:
                task.emit({"type": "phase", "name": "collect"})
                for index, detail_id in enumerate(ids, start=1):
                    task.emit(
                        {"type": "comment.start", "index": index, "total": len(ids), "id": detail_id}
                    )
                    data = await self.comment_handle_single(
                        detail_id,
                        cookie=cookie,
                        proxy=proxy,
                        source=False,
                        pages=pages,
                        cursor=cursor,
                        count=count,
                        count_reply=count_reply,
                        reply=reply,
                    )
                    task.emit(
                        {
                            "type": "comment.done",
                            "index": index,
                            "total": len(ids),
                            "id": detail_id,
                            "ok": bool(data),
                            "count": len(data) if isinstance(data, list) else 0,
                        }
                    )
            finally:
                self._restore_api_progress(original_api)

    async def _run_collect_user_data_task(
        self,
        task: UITask,
        *,
        text: str,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not self.parameter.storage_format:
                raise ValueError("storage_format is not configured")

            task.emit({"type": "phase", "name": "extract_accounts"})
            sec_user_ids = await self.links.run(text, type_="user", proxy=proxy)
            sec_user_ids = [i for i in sec_user_ids if i]
            task.meta["accounts_count"] = len(sec_user_ids)
            task.emit({"type": "meta", **task.meta})
            if not sec_user_ids:
                raise ValueError("no accounts extracted")

            original_api = self._patch_api_progress(task)
            try:
                users = []
                for index, sec_user_id in enumerate(sec_user_ids, start=1):
                    task.emit(
                        {
                            "type": "user.start",
                            "index": index,
                            "total": len(sec_user_ids),
                            "sec_user_id": sec_user_id,
                        }
                    )
                    users.append(await self._get_user_data(sec_user_id, cookie=cookie, proxy=proxy))
                extracted = [i for i in users if i]
                await self._deal_user_data(extracted, source=False)
                task.emit({"type": "user.done", "ok": bool(extracted), "count": len(extracted)})
            finally:
                self._restore_api_progress(original_api)

    async def _run_collect_hot_task(
        self,
        task: UITask,
        *,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not self.parameter.storage_format:
                raise ValueError("storage_format is not configured")

            original_api = self._patch_api_progress(task)
            try:
                task.emit({"type": "phase", "name": "collect"})
                time_, data = await self._deal_hot_data(
                    source=False,
                    cookie=cookie,
                    proxy=proxy,
                )
                task.emit({"type": "hot.done", "time": time_, "ok": bool(data)})
            finally:
                self._restore_api_progress(original_api)

    async def _run_collect_search_task(
        self,
        task: UITask,
        *,
        mode: str,
        keyword: str,
        pages: int,
        offset: int,
        count: int,
        sort_type: int,
        publish_time: int,
        duration: int,
        search_range: int,
        content_type: int,
        douyin_user_fans: int,
        douyin_user_type: int,
        cookie: str | None,
        proxy: str | None,
    ) -> None:
        async with self._ui_task_lock:
            if not self.parameter.storage_format:
                raise ValueError("storage_format is not configured")

            channel = {"general": 0, "video": 1, "user": 2, "live": 3}[mode]
            model = self.generate_model(
                channel,
                keyword,
                pages,
                sort_type,
                publish_time,
                duration,
                search_range,
                content_type,
                douyin_user_fans,
                douyin_user_type,
            )
            if isinstance(model, str):
                raise ValueError(model)

            original_api = self._patch_api_progress(task)
            try:
                task.emit({"type": "phase", "name": "collect"})
                data = await self.deal_search_data(model, source=False)
                task.emit({"type": "search.done", "ok": bool(data)})
            finally:
                self._restore_api_progress(original_api)
