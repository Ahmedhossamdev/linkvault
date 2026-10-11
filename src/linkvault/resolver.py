"""Resolve short links (lnkd.in guard pages, bit.ly, t.co) to final URLs."""
import re
import html
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"


def resolve_lnkd(short_url: str, timeout: int = 15) -> str:
    """lnkd.in serves an interstitial page. The real URL lives in the
    anchor with data-tracking-control-name=external_url_click."""
    try:
        req = urllib.request.Request(short_url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read(80000).decode("utf-8", errors="ignore")
        m = re.search(r'data-tracking-control-name="external_url_click"[^>]*href="([^"]+)"', data)
        if m:
            return html.unescape(m.group(1))
        return short_url
    except Exception:
        return short_url


def resolve_generic(url: str, timeout: int = 15) -> str:
    if "lnkd.in/" in url:
        return resolve_lnkd(url, timeout)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler)
        with opener.open(req, timeout=timeout) as r:
            try:
                r.read(1024)
            except Exception:
                pass
            return r.geturl()
    except Exception:
        return url


def resolve_urls(urls: list[str], workers: int = 20, timeout: int = 15) -> dict[str, str]:
    """Return {original: final}. Runs in a thread pool with progress-safe ordering."""
    out: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(resolve_generic, u, timeout): u for u in urls}
        for f in as_completed(futs):
            orig = futs[f]
            try:
                out[orig] = f.result()
            except Exception:
                out[orig] = orig
    return out


def dedupe_by_final(pairs: list[tuple[str, str]]) -> list[tuple[str, str]]:
    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for orig, final in pairs:
        key = final.rstrip("/").lower()
        if key not in seen:
            seen.add(key)
            out.append((orig, final))
    return out
