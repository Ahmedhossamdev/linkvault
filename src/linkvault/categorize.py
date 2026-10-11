"""Keyword topic labeling. Order matters: specific topics first."""
import urllib.parse
from collections import defaultdict

DEFAULT_TOPICS: list[tuple[str, list[str]]] = [
    ("dsa-interview", ["leetcode.com", "neetcode", "hackerrank", "codesignal", "lintcode", "stratascratch", "datalemur", "algomaster", "grind75", "algoexpert", "greatfrontend", "codingchallenges.fyi", "data structure", "dynamic programming", "sliding window", "two pointer", "backtracking"]),
    ("system-design", ["system design", "systemdesign", "microservice", "distributed system", "bytebytego", "load balancer", "consistent hashing", "sharding", "kafka", "rabbitmq", "cap theorem"]),
    ("db", ["postgres", "crunchydata", "mysql", "redis", "mongo", "cassandra", "clickhouse", "elasticsearch", "database"]),
    ("os-linux", ["linux", "kernel", "ebpf", "syscall", "file system", "memory management"]),
    ("network", ["tcp", "dns", "nginx", "cloudflare", "websocket", "grpc", "proxy", "husseinnasser.com/network", "husseinnasser.com/nginx"]),
    ("docker-k8s-devops", ["docker", "kubernetes", "k8s", "kcna", "terraform", "ansible", "devops", "gcp", "azure"]),
    ("backend", ["node.js", "nodejs", "spring boot", "django", "flask", "fastapi", "backend", "api design", "api testing", "hnasr"]),
    ("frontend-js", ["javascript", "typescript", "react", "frontend", "eloquent javascript", "jsv9000", "learnjavascript"]),
    ("python", ["learnpython", "python"]),
    ("java", ["spring", "java "]),
    ("go", ["golang", "go concurrency"]),
    ("ai-ml", ["kaggle", "machine learning", "deep learning", "llm", "transformer", "pytorch", "huggingface", "langchain", "anthropic", "openai"]),
    ("security", ["tryhackme", "owasp"]),
    ("career-jobs", ["career", "hiring", "resume", "wellfound", "toptal", "jobfair", "crewteq"]),
    ("courses", ["course", "udemy", "amigoscode", "coursera", "tutorial", "masterclass", "skillbuilder"]),
]


def guess_topic(title: str, url: str) -> str:
    t = title.lower()
    u = url.lower()
    try:
        host = urllib.parse.urlparse(url).netloc.lower()
    except Exception:
        host = ""
    if "linkedin.com" in host:
        return "linkedin-posts"
    blob = t + " " + u
    for topic, keywords in DEFAULT_TOPICS:
        if any(k in blob for k in keywords):
            return topic
    if "youtube.com" in host or "youtu.be" in host:
        return "videos"
    if "github.com" in host:
        return "github-repos"
    if "medium.com" in host or "substack" in host or "newsletter" in host or "blog." in host:
        return "articles"
    return "misc-useful"


def organize(items: list[tuple[str, str]]) -> dict[str, list[tuple[str, str]]]:
    """items: [(title, url)]. Returns {topic: [(title, url)]}."""
    grouped: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for title, url in items:
        grouped[guess_topic(title, url)].append((title, url))
    return dict(grouped)
