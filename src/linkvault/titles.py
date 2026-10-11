"""Fetch page titles for final URLs. Stdlib only, parallel."""
import re
import html
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"


def fetch_title(url: str, timeout: int = 12) -> str:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            ctype = r.headers.get("Content-Type", "")
            if ctype and "html" not in ctype and "text" not in ctype:
                return url.split("/")[-1][:100] or url
            data = r.read(200000).decode("utf-8", errors="ignore")
        m = re.search(r"<title[^>]*>(.*?)</title>", data, re.I | re.S)
        if m:
            return html.unescape(re.sub(r"\s+", " ", m.group(1))).strip()[:150]
    except Exception:
        pass
    try:
        p = urllib.parse.urlparse(url)
        path = p.path.strip("/").replace("-", " ").replace("_", " ")[:80]
        return f"{p.netloc} / {path}" if path else p.netloc
    except Exception:
        return url


def fetch_titles(urls: list[str], workers: int = 20, timeout: int = 12) -> dict[str, str]:
    out: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(fetch_title, u, timeout): u for u in urls}
        for f in as_completed(futs):
            u = futs[f]
            try:
                out[u] = f.result()
            except Exception:
                out[u] = u
    return out
