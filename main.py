from __future__ import annotations

from asyncio import CancelledError, run
from sys import argv

from src.application import TikTokDownloader
from src.application.main_desktop import run_desktop


async def main_cli():
    async with TikTokDownloader() as downloader:
        try:
            await downloader.run()
        except (
                KeyboardInterrupt,
                CancelledError,
        ):
            return


if __name__ == "__main__":
    if "--cli" in argv:
        run(main_cli())
    else:
        run_desktop()
