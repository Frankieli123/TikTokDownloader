from re import IGNORECASE, compile
from typing import TYPE_CHECKING
from urllib.parse import urlparse

from httpx import get, head

from ..custom import wait
from ..tools import DownloaderError, Retry, capture_error_request

if TYPE_CHECKING:
    from httpx import AsyncClient, get, head

    from ..config import Parameter

__all__ = ["Requester"]


class Requester:
    URL = compile(r"(https?://[^\s\"<>\\^`{|}，。；！？、【】《》]+)")
    SHORT_NETLOCS = {
        "v.douyin.com",
        "vm.tiktok.com",
        "vt.tiktok.com",
    }
    HTML_URL_CANONICAL = compile(
        r'<link[^>]+rel=["\']canonical["\'][^>]*href=["\'](https?://[^"\']+)["\']',
        IGNORECASE,
    )
    HTML_URL_META_REFRESH = compile(
        r'<meta[^>]+http-equiv=["\']refresh["\'][^>]*content=["\'][^"\']*url\s*=\s*([^"\'>\s]+)',
        IGNORECASE,
    )
    HTML_URL_ANCHOR = compile(
        r'<a[^>]+href=["\'](https?://[^"\']+)["\']',
        IGNORECASE,
    )

    def __init__(
        self,
        params: "Parameter",
        client: "AsyncClient",
        headers: dict[str, str],
    ):
        self.client = client
        self.headers = headers
        self.log = params.logger
        self.max_retry = params.max_retry
        self.timeout = params.timeout

    async def run(
        self,
        text: str,
        proxy: str = None,
    ) -> str:
        urls = self.URL.finditer(text)
        if not urls:
            return ""
        result = []
        for i in urls:
            result.append(
                await self.request_url(
                    u := i.group(),
                    proxy=proxy,
                )
                or u
            )
            await wait()
        return " ".join(i for i in result if i)

    @staticmethod
    def _extract_url_from_html(html: str) -> str | None:
        if not html:
            return None
        for pattern in (
            Requester.HTML_URL_CANONICAL,
            Requester.HTML_URL_META_REFRESH,
            Requester.HTML_URL_ANCHOR,
        ):
            if m := pattern.search(html):
                return m.group(1)
        return None

    async def _resolve_short_link_url(
        self,
        url: str,
        *,
        proxy: str | None,
    ) -> str | None:
        try:
            response = (
                self.request_url_get_proxy(url, proxy)
                if proxy
                else await self.request_url_get(url)
            )
        except Exception:
            return None
        resolved = str(getattr(response, "url", "") or "")
        if resolved and urlparse(resolved).netloc.lower() not in self.SHORT_NETLOCS:
            return resolved
        return self._extract_url_from_html(getattr(response, "text", "") or "")

    @Retry.retry
    @capture_error_request
    async def request_url(
        self,
        url: str,
        content="url",
        proxy: str = None,
    ):
        self.log.info(f"URL: {url}", False)
        match (content in {"url", "headers"}, bool(proxy)):
            case True, True:
                response = self.request_url_head_proxy(
                    url,
                    proxy,
                )
            case True, False:
                response = await self.request_url_head(url)
            case False, True:
                response = self.request_url_get_proxy(
                    url,
                    proxy,
                )
            case False, False:
                response = await self.request_url_get(url)
            case _:
                raise DownloaderError
        self.log.info(f"Response URL: {response.url}", False)
        self.log.info(f"Response Code: {response.status_code}", False)
        # 记录请求体数据会导致日志文件体积过大，仅在必要时记录
        # self.log.info(f"Response Content: {response.content}", False)
        self.log.info(f"Response Headers: {dict(response.headers)}", False)
        match content:
            case "text":
                return response.text
            case "content":
                return response.content
            case "json":
                return response.json()
            case "headers":
                return response.headers
            case "url":
                resolved = str(response.url)
                try:
                    original_host = urlparse(url).netloc.lower()
                    resolved_host = urlparse(resolved).netloc.lower()
                except Exception:
                    return resolved
                if original_host in self.SHORT_NETLOCS and resolved_host == original_host:
                    return (
                        await self._resolve_short_link_url(url, proxy=proxy) or resolved
                    )
                return resolved
            case _:
                raise DownloaderError

    async def request_url_head(
        self,
        url: str,
    ):
        return await self.client.head(
            url,
            headers=self.headers,
        )

    def request_url_head_proxy(
        self,
        url: str,
        proxy: str,
    ):
        return head(
            url,
            headers=self.headers,
            proxy=proxy,
            follow_redirects=True,
            verify=False,
            timeout=self.timeout,
        )

    async def request_url_get(
        self,
        url: str,
    ):
        response = await self.client.get(
            url,
            headers=self.headers,
        )
        response.raise_for_status()
        return response

    def request_url_get_proxy(
        self,
        url: str,
        proxy: str,
    ):
        response = get(
            url,
            headers=self.headers,
            proxy=proxy,
            follow_redirects=True,
            verify=False,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response
