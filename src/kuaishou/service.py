from __future__ import annotations

from typing import Any, Callable

from .paths import default_paths

ProgressFactory = Callable[[], Any] | None


class KuaishouService:
    def __init__(self) -> None:
        default_paths().ensure_dirs()

    def read_settings(self) -> dict[str, Any]:
        from .source.config import Config
        from .source.tools import ColorConsole

        console = ColorConsole(False)
        config = Config(console)
        data = config.read()
        return data if isinstance(data, dict) else {}

    def write_settings(self, patch: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(patch, dict):
            return self.read_settings()

        from .source.config import Config
        from .source.tools import ColorConsole

        console = ColorConsole(False)
        config = Config(console)
        current = config.read()
        if not isinstance(current, dict):
            current = {}
        next_data = current | patch
        config.write(next_data)
        return next_data

    async def resolve_share_text(self, text: str, *, proxy: str | None = None) -> list[str]:
        from .source.app.app import KS

        async with KS(server_mode=True, proxy=proxy) as app:
            urls = await app.examiner.run(text or "", type_="")
        if isinstance(urls, list):
            return [str(i) for i in urls if i]
        if isinstance(urls, str):
            return [i for i in urls.split() if i]
        return []

    async def fetch_detail(
        self,
        text: str,
        *,
        cookie: str | None = None,
        proxy: str | None = None,
    ) -> dict[str, Any] | None:
        from .source.app.app import KS

        async with KS(server_mode=True, cookie=cookie, proxy=proxy) as app:
            await app.database.read_config()
            urls = await app.examiner.run(text or "")
            if not urls:
                return None
            data = await app.detail_one(
                urls[0],
                download=False,
            )
        return data if isinstance(data, dict) and data else None

    async def download_detail_text(
        self,
        text: str,
        *,
        cookie: str | None = None,
        proxy: str | None = None,
        progress_factory: ProgressFactory = None,
    ) -> dict[str, Any]:
        from .source.app.app import KS

        async with KS(server_mode=True, cookie=cookie, proxy=proxy) as app:
            await app.database.read_config()
            if progress_factory is not None:
                app.download.general_progress_object = progress_factory

            urls = await app.examiner.run(text or "")
            if not urls:
                return {"works_count": 0, "ok_count": 0, "download_root": str(app.manager.folder)}

            ok = 0
            for url in urls:
                try:
                    data = await app.detail_one(
                        url,
                        download=True,
                    )
                    if isinstance(data, dict) and data:
                        ok += 1
                except Exception:
                    continue

            return {
                "works_count": len(urls),
                "ok_count": ok,
                "download_root": str(app.manager.folder),
            }
