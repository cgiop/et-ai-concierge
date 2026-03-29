"""Lightweight RAG: load ET JSON knowledge base and rank articles by keyword overlap."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_DATA_DIR = Path(__file__).resolve().parent / "data"
_DEFAULT_KB = _DATA_DIR / "et_knowledge_base.json"


def _tokenize(text: str) -> set[str]:
    return {t for t in re.split(r"[^\w]+", text.lower()) if len(t) > 2}


def load_knowledge_base(path: Path | None = None) -> list[dict[str, Any]]:
    p = path or _DEFAULT_KB
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Knowledge base JSON must be a list of articles")
    return data


def search_articles(
    query: str,
    articles: list[dict[str, Any]] | None = None,
    top_k: int = 5,
    path: Path | None = None,
) -> list[dict[str, Any]]:
    """Keyword overlap retrieval — no vector DB required for hackathon demo."""
    pool = articles if articles is not None else load_knowledge_base(path)
    q_tokens = _tokenize(query)
    if not q_tokens:
        return pool[:top_k]

    scored: list[tuple[int, dict[str, Any]]] = []
    for art in pool:
        blob = " ".join(
            str(art.get(k, "")) for k in ("title", "content", "tags", "type")
        )
        if isinstance(art.get("tags"), list):
            blob += " " + " ".join(str(t) for t in art["tags"])
        a_tokens = _tokenize(blob)
        overlap = len(q_tokens & a_tokens)
        # slight boost for title match
        title_tokens = _tokenize(str(art.get("title", "")))
        if q_tokens & title_tokens:
            overlap += 2
        scored.append((overlap, art))

    scored.sort(key=lambda x: (-x[0], str(x[1].get("id", ""))))
    filtered = [a for score, a in scored if score > 0]
    if not filtered:
        return pool[:top_k]
    return filtered[:top_k]


def format_excerpts_for_llm(articles: list[dict[str, Any]], max_chars_per: int = 1200) -> str:
    """Build a single string for the RAG synthesis prompt."""
    blocks: list[str] = []
    for art in articles:
        aid = art.get("id", "")
        title = art.get("title", "")
        typ = art.get("type", "")
        tags = art.get("tags", [])
        content = str(art.get("content", ""))[:max_chars_per]
        tag_str = ", ".join(str(t) for t in tags) if isinstance(tags, list) else str(tags)
        blocks.append(
            f"[{aid}] type={typ} title={title!r} tags=[{tag_str}]\n{content}\n---"
        )
    return "\n".join(blocks)
