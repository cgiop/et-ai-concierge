"""
Single entry to run the ET AI Concierge full concierge stack.

- ``python model.py`` / ``python -m model`` → full concierge (entire stack).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _load_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(os.path.join(_REPO_ROOT, ".env"))
    except ImportError:
        pass


def _print_provider_hint() -> None:
    prov = (os.getenv("ET_LLM_PROVIDER", "gemini") or "gemini").strip().lower()
    if prov == "grok":
        has_key = bool(os.getenv("XAI_API_KEY", "").strip() or os.getenv("GROK_API_KEY", "").strip())
        print("LLM provider: grok; XAI/GROK key:", "set" if has_key else "not set")
    else:
        has_key = bool(
            os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
        )
        print(
            "LLM provider: gemini; API key:",
            "set" if has_key else "not set (mock / heuristic mode)",
        )


DEFAULT_CONVERSATION = (
    "I'm new to investing, prefer low risk. I want tax saving and a house in 7 years. "
    "I read ET sometimes but don't use ET Markets yet."
)
DEFAULT_RAG_Q = "Should I use ELSS or debt funds for my 3-year goal?"


def run_model(
    *,
    conversation_text: str | None = None,
    user_query_for_rag: str | None = None,
    print_provider_hint: bool = True,
) -> dict[str, Any]:
    """
    Execute the full ET AI Concierge pipeline and return a JSON-serializable dict.
    """
    from model import concierge_to_frontend_json, run_concierge_pipeline

    ct = conversation_text or DEFAULT_CONVERSATION
    rq = user_query_for_rag or DEFAULT_RAG_Q

    state = run_concierge_pipeline(ct, rq, skip_rag=False)
    return concierge_to_frontend_json(state)


def main(argv: list[str] | None = None) -> None:
    """CLI: runs the full ET AI Concierge stack."""
    _load_env()

    parser = argparse.ArgumentParser(
        description="ET AI Concierge — run the full concierge stack.",
    )
    parser.add_argument(
        "--no-hint",
        action="store_true",
        help="Do not print LLM provider / key hint line",
    )
    args = parser.parse_args(argv if argv is not None else sys.argv[1:])

    if not args.no_hint:
        _print_provider_hint()

    out = run_model()
    print(json.dumps(out, indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
