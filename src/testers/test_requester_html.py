from src.link.requester import Requester


def test_extract_url_from_html_anchor():
    html = '<a href="https://www.iesdouyin.com/share/video/7168743658076900608/">Found</a>'
    assert (
        Requester._extract_url_from_html(html)
        == "https://www.iesdouyin.com/share/video/7168743658076900608/"
    )


def test_extract_url_from_html_meta_refresh():
    html = '<meta http-equiv="refresh" content="0;url=https://www.douyin.com/video/7168743658076900608">'
    assert (
        Requester._extract_url_from_html(html)
        == "https://www.douyin.com/video/7168743658076900608"
    )


def test_extract_url_from_html_canonical():
    html = '<link rel="canonical" href="https://www.douyin.com/video/7168743658076900608">'
    assert (
        Requester._extract_url_from_html(html)
        == "https://www.douyin.com/video/7168743658076900608"
    )

