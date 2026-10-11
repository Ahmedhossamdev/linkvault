from linkvault.extractor import extract_urls
from linkvault.categorize import guess_topic


def test_extract_filters_linkedin_noise():
    html = '<a href="https://www.linkedin.com/in/someone">x</a><a href="https://example.com/article">y</a>'
    urls = extract_urls(html, strict_suffix=False)
    assert urls == ["https://example.com/article"]


def test_guess_topic_db():
    assert guess_topic("Postgres indexing guide", "https://example.com/x") == "db"


def test_guess_topic_video():
    assert guess_topic("Some talk", "https://www.youtube.com/watch?v=abc") == "videos"
