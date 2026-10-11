"""CLI: linkvault full chat.html -> organized collection."""
import argparse
import os
import sys

from .extractor import extract_urls
from .resolver import resolve_urls, dedupe_by_final
from .titles import fetch_titles
from .categorize import organize
from .obsidian import write_obsidian, write_single_collection


def cmd_full(args: argparse.Namespace) -> int:
    with open(args.input, encoding="utf-8", errors="ignore") as f:
        html_text = f.read()
    print(f"read {len(html_text)} chars from {args.input}")
    urls = extract_urls(html_text)
    print(f"extracted {len(urls)} candidates")
    resolved = resolve_urls(urls, workers=args.workers, timeout=args.timeout)
    pairs = dedupe_by_final([(o, resolved.get(o, o)) for o in urls])
    live = [(o, fn) for o, fn in pairs if "lnkd.in" not in fn and "linkedin.com/uas/login" not in fn]
    dead = [(o, fn) for o, fn in pairs if "lnkd.in" in fn]
    print(f"live {len(live)}, dead {len(dead)}")
    finals = [fn for _, fn in live]
    titles = fetch_titles(finals, workers=args.workers)
    items = [(titles.get(u, u), u) for u in finals]
    grouped = organize(items)
    os.makedirs(args.out, exist_ok=True)
    single = os.path.join(args.out, "collection.md")
    write_single_collection(grouped, single)
    print(f"wrote {single}")
    if args.obsidian:
        obs_dir = args.obsidian
        dead_items = [(o, o) for o, _ in dead]
        write_obsidian(grouped, obs_dir, dead=dead_items)
        print(f"wrote obsidian notes to {obs_dir}")
    for topic in sorted(grouped):
        print(f"  {topic}: {len(grouped[topic])}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="linkvault", description="Chat HTML to topic-labeled link collection")
    p.add_argument("--workers", type=int, default=20)
    p.add_argument("--timeout", type=int, default=15)
    sub = p.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("full", help="HTML file to organized collection")
    f.add_argument("input", help="saved chat HTML file (see browser/README)")
    f.add_argument("--out", default="out", help="output dir for collection.md")
    f.add_argument("--obsidian", default="", help="output dir for per-topic obsidian notes")
    f.set_defaults(func=cmd_full)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
