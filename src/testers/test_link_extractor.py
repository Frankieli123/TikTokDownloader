from types import SimpleNamespace

from src.link.extractor import Extractor


class _Log:
    def info(self, *_args, **_kwargs):
        pass

    def warning(self, *_args, **_kwargs):
        pass

    def error(self, *_args, **_kwargs):
        pass


def _create_extractor():
    params = SimpleNamespace(
        logger=_Log(),
        max_retry=1,
        timeout=10,
        client=None,
        client_tiktok=None,
        headers={},
        headers_tiktok={},
    )
    return Extractor(params)


def test_detail_accepts_plain_id():
    extractor = _create_extractor()
    assert extractor.detail("7168743658076900608") == ["7168743658076900608"]


def test_detail_does_not_treat_mix_id_as_detail():
    extractor = _create_extractor()
    assert extractor.detail("https://www.douyin.com/collection/7168743658076900608") == []

