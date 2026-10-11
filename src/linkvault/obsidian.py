"""Write Obsidian-friendly markdown files, one per topic plus an MOC index."""
import os
from datetime import date

FRONTMATTER_TAGS = {
    "system-design": ["distributed-systems", "learn", "resources"],
    "backend": ["back-end", "learn", "resources"],
    "db": ["database", "learn", "resources"],
    "os-linux": ["os", "linux", "learn", "resources"],
    "network": ["network", "learn", "resources"],
    "docker-k8s-devops": ["docker", "learn", "resources"],
    "dsa-interview": ["interview", "learn", "resources"],
    "frontend-js": ["front-end", "learn", "resources"],
    "python": ["learn", "resources"],
    "java": ["learn", "resources"],
    "go": ["go", "learn", "resources"],
    "ai-ml": ["ai", "learn", "resources"],
    "security": ["learn", "resources"],
    "career-jobs": ["career", "learn", "resources"],
    "courses": ["course", "learn", "resources"],
    "videos": ["video", "youtube", "learn"],
    "github-repos": ["learn", "resources"],
    "articles": ["read", "learn", "resources"],
    "linkedin-posts": ["learn", "resources"],
    "misc-useful": ["learn", "resources"],
}


def _safe(text: str) -> str:
    return text.replace("[", "(").replace("]", ")").replace("|", "-").replace("\u2014", "-").replace("\u2013", "-").strip()


def write_obsidian(grouped: dict[str, list[tuple[str, str]]], out_dir: str, dead: list[tuple[str, str]] | None = None) -> list[str]:
    os.makedirs(out_dir, exist_ok=True)
    today = date.today().isoformat()
    written: list[str] = []
    for topic in sorted(grouped.keys()):
        items = sorted(grouped[topic], key=lambda x: x[0].lower())
        tags = FRONTMATTER_TAGS.get(topic, ["learn", "resources"])
        tag_block = "\n".join(f"  - {t}" for t in tags)
        title = topic.replace("-", " ").title() + " Links"
        path = os.path.join(out_dir, f"{topic}.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"---\ntitle: {title}\ntags:\n{tag_block}\ndate: {today}\nstatus: complete\n---\n\n")
            f.write(f"# {title}\n\n> [!summary]\n> {len(items)} links, auto sorted.\n\n## Notes\n\n- Move good items to study topics when ready.\n\n## References\n\n")
            for t, u in items:
                f.write(f"- [{_safe(t or u)[:150]}]({u})\n")
        written.append(path)
    if dead:
        path = os.path.join(out_dir, "dead-lnkd-in-expired.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"---\ntitle: Dead LinkedIn Short Links\ndate: {today}\nstatus: complete\ntags:\n  - learn\n  - resources\n---\n\n")
            f.write("# Dead LinkedIn Short Links\n\n> [!summary]\n> Short links that no longer expand.\n\n## References\n\n")
            for t, u in sorted(dead):
                f.write(f"- {_safe(t or u)[:150]} : {u}\n")
        written.append(path)
    moc = os.path.join(out_dir, "link-collection-moc.md")
    with open(moc, "w", encoding="utf-8") as f:
        f.write(f"---\ntitle: Link Collection MOC\ndate: {today}\nstatus: complete\ntags:\n  - learn\n  - resources\n---\n\n")
        f.write("# Link Collection MOC\n\n> [!summary]\n> Index of extracted links by topic.\n\n## Topics\n\n")
        for topic in sorted(grouped.keys()):
            f.write(f"- [[{topic}]] ({len(grouped[topic])})\n")
        if dead:
            f.write(f"- [[dead-lnkd-in-expired]] ({len(dead)})\n")
    written.append(moc)
    return written


def write_single_collection(grouped: dict[str, list[tuple[str, str]]], path: str) -> str:
    total = sum(len(v) for v in grouped.values())
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Link collection\n\n")
        f.write(f"Total unique links: {total}\n\n")
        for topic in sorted(grouped.keys()):
            items = sorted(grouped[topic], key=lambda x: x[0].lower())
            f.write(f"## {topic} ({len(items)})\n\n")
            for t, u in items:
                f.write(f"- [{_safe(t or u)[:150]}]({u})\n")
            f.write("\n")
    return path
