"""Extract candidate URLs from a saved chat HTML page."""
import re
import html

SKIP_SUBSTRINGS = [
    "static.", ".licdn.com", "linkedin.com/in/", "linkedin.com/company/",
    "linkedin.com/feed", "linkedin.com/messaging/thread",
    "linkedin.com/search", "linkedin.com/jobs", "linkedin.com/groups",
    "w3.org", "schema.org", "linkedin.com/help", "linkedin.com/legal",
    "linkedin.com/mynetwork", "linkedin.com/notifications",
    "linkedin.com/services/page", "linkedin.com/accessibility",
    "about.linkedin.com", "merchantpool",
]
SKIP_EXTENSIONS = (".png", ".jpg", ".jpeg", ".svg", ".gif", ".css", ".js", ".woff", ".woff2", ".ico")
FAKE_HOSTS = {"1.auto", "brd.md", "cases.md", "codereview.md", "sprintbacklog.md", "sr.java"}

GOOD_SUFFIXES = (
    ".com", ".org", ".io", ".dev", ".net", ".edu", ".me", ".so", ".tv",
    ".co", ".ai", ".app", ".tech", ".blog", ".substack.com", ".github.io",
    ".medium.com", ".youtube.com", ".youtu.be",
)


def _clean(url: str) -> str:
    return html.unescape(url).rstrip(").,;!").strip()


def extract_urls(html_text: str, keep_linkedin_posts: bool = True, strict_suffix: bool = True) -> list[str]:
    """Return deduped candidate URLs from hrefs plus raw text URLs."""
    hrefs = re.findall(r'href="([^"]+)"', html_text)
    text_urls = re.findall(r"https?://[^\s<>\"']+", html_text)
    seen: dict[str, None] = {}
    for raw in hrefs + text_urls:
        u = _clean(raw)
        if not u.startswith("http"):
            continue
        ul = u.lower()
        if any(s in ul for s in SKIP_SUBSTRINGS):
            # keep linkedin posts/pulse, drop the rest
            if keep_linkedin_posts and any(k in ul for k in ["/posts/", "/pulse/", "/advice/", "/events/", "/learning/"]):
                pass
            elif "linkedin.com" in ul:
                continue
            else:
                continue
        if any(ul.split("?")[0].lower().endswith(e) for e in SKIP_EXTENSIONS):
            continue
        if u not in seen:
            seen[u] = None
    out = list(seen.keys())
    if strict_suffix:
        filtered: list[str] = []
        for u in out:
            try:
                from urllib.parse import urlparse
                host = urlparse(u).netloc.lower()
            except Exception:
                continue
            if not host:
                continue
            if "lnkd.in" in u or "bit.ly" in u or "tinyurl.com" in u or "t.co/" in u:
                filtered.append(u)
                continue
            if "linkedin.com" in host:
                filtered.append(u)
                continue
            if host in FAKE_HOSTS:
                continue
            if any(host.endswith(s) for s in GOOD_SUFFIXES):
                filtered.append(u)
        return filtered
    return out
