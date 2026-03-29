"""
Single entry to run the ET AI Concierge full concierge stack.

- ``python -m backend.app`` / ``python -m backend`` → full concierge (entire stack).
"""

from __future__ import annotations

import argparse
import contextlib
import http.server
import json
import os
import socketserver
import sys
import time
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


def _message_mentions(text: str, *patterns: str) -> bool:
    lowered = text.lower()
    return any(pattern in lowered for pattern in patterns)


def _compose_heuristic_chat_reply(message: str, artifact: dict[str, Any]) -> str:
    lower = message.lower().strip()
    persona = artifact.get("core", {}).get("persona", {}) or {}
    recs = artifact.get("core", {}).get("recommendations", {}) or {}
    actions = recs.get("recommended_actions") or []
    products = recs.get("recommended_products") or []
    risk = str(persona.get("risk_appetite") or "moderate").lower()
    goals = ", ".join(persona.get("financial_goals") or [])

    if _message_mentions(lower, "starting amount", "how much should i invest", "how much can i invest", "beginner", "just starting", "first investment", "start investing"):
        return (
            "For a beginner, the best starting amount is one you can invest every month without disrupting rent, bills, or your emergency cushion. "
            "Start small, make it automatic, and increase it only after the habit feels easy to maintain."
        )
    if _message_mentions(lower, "sip", "systematic investment plan"):
        return (
            "A SIP works best when the amount is sustainable through both calm and volatile markets. "
            "Think consistency first, then step up the amount gradually as your income and confidence improve."
        )
    if _message_mentions(lower, "retirement", "retire", "pension"):
        return (
            "For retirement planning, the first move is to estimate how far away the goal is and then choose growth-oriented instruments only if that horizon is long enough. "
            "After that, build a regular investing habit and review the mix as your timeline gets shorter."
        )
    if _message_mentions(lower, "emergency fund", "rainy day", "contingency"):
        return (
            "An emergency fund should come before most long-term investing. "
            "The goal is liquidity and stability, so keep it easy to access rather than chasing high returns."
        )
    if _message_mentions(lower, "tax", "elss", "80c"):
        return (
            "If tax saving is the main goal, compare lock-in period and volatility against when you will actually need the money. "
            "A tax-saving product is useful only when it also fits the goal timeline."
        )
    if _message_mentions(lower, "loan", "emi", "borrow", "credit"):
        return (
            "For a loan decision, begin with affordability rather than just the lowest advertised rate. "
            "If the EMI would crowd out savings or emergency reserves, the structure needs rethinking before you borrow."
        )
    if _message_mentions(lower, "insurance", "term cover", "health cover"):
        return (
            "Insurance should protect the risks that would seriously damage your finances, not act as an investment substitute. "
            "Start by checking whether your current cover is enough for dependents, debt, and medical shocks."
        )
    if _message_mentions(lower, "mutual fund", "index fund", "etf"):
        return (
            "When choosing between funds, begin with goal, timeline, and risk tolerance rather than recent returns. "
            "For many beginners, simpler broad-market exposure is easier to stick with than complex thematic bets."
        )
    if _message_mentions(lower, "portfolio", "diversif", "allocation", "asset mix"):
        return (
            "Portfolio decisions usually improve when you match risk to time horizon and avoid concentrating too much in one idea or one asset class. "
            "A good next step is to review whether your current mix actually matches the goal you mentioned."
        )

    first_action = next(
        (
            action.get("label")
            or action.get("name")
            or action.get("description")
            for action in actions
            if isinstance(action, dict)
        ),
        None,
    )
    first_product = next(
        (
            product.get("why_it_fits")
            or product.get("summary")
            or product.get("name")
            for product in products
            if isinstance(product, dict)
        ),
        None,
    )

    context_parts = []
    if goals:
        context_parts.append(f"your goals around {goals}")
    if risk:
        context_parts.append(f"a {risk} risk stance")
    context = " and ".join(context_parts)

    if first_action:
        base = f"Based on your question, the strongest next step is to {first_action[0].lower() + first_action[1:] if len(first_action) > 1 else first_action.lower()}."
    elif first_product:
        base = f"A practical next move is to explore {first_product[0].lower() + first_product[1:] if len(first_product) > 1 else first_product.lower()}."
    else:
        base = "The best next step is to match your investment choice to your timeline, cash-flow comfort, and risk tolerance."

    if context:
        base += f" That fits well with {context}."
    return base


@contextlib.contextmanager
def _force_heuristic_mode(enabled: bool):
    if not enabled:
        yield
        return

    keys = ("GEMINI_API_KEY", "GOOGLE_API_KEY", "XAI_API_KEY", "GROK_API_KEY")
    prev = {k: os.environ.get(k) for k in keys}
    try:
        for k in keys:
            os.environ.pop(k, None)
        yield
    finally:
        for k, v in prev.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def run_model(
    *,
    conversation_text: str | None = None,
    user_query_for_rag: str | None = None,
    print_provider_hint: bool = True,
    skip_rag: bool = False,
    use_live_llm: bool = False,
) -> dict[str, Any]:
    """
    Execute the full ET AI Concierge pipeline and return a JSON-serializable dict.
    """
    from .orchestrator import concierge_to_frontend_json, run_concierge_pipeline

    ct = conversation_text or DEFAULT_CONVERSATION
    rq = user_query_for_rag or DEFAULT_RAG_Q

    with _force_heuristic_mode(not use_live_llm):
        state = run_concierge_pipeline(ct, rq, skip_rag=skip_rag)
    return concierge_to_frontend_json(state)


def run_chat_model(
    *,
    conversation_transcript: str,
    user_message: str,
    use_live_llm: bool = False,
) -> dict[str, Any]:
    from .agentic import run_agentic_concierge
    from .llm_provider import llm_available
    from .orchestrator import concierge_to_frontend_json, run_concierge_pipeline
    from .rag import search_articles

    transcript = (conversation_transcript or user_message or DEFAULT_CONVERSATION).strip()
    message = (user_message or DEFAULT_RAG_Q).strip()

    if use_live_llm and llm_available():
        try:
            result = run_agentic_concierge(
                user_goal=message,
                conversation_transcript=transcript,
            )
            artifact = result.last_artifact
            if result.mode != "error":
                return {
                    "message": result.final_message,
                    "mode": result.mode,
                    "artifact": artifact,
                }
        except Exception:
            pass

    with _force_heuristic_mode(True):
        state = run_concierge_pipeline(
            transcript,
            message,
            skip_rag=False,
        )
    artifact = concierge_to_frontend_json(state)
    articles = search_articles(message, top_k=2)
    rag_answer = artifact.get("core", {}).get("rag", {}) or {}
    recommendations = artifact.get("core", {}).get("recommendations", {}) or {}
    products = recommendations.get("recommended_products") or []
    names = [p.get("name", "") for p in products[:2] if p.get("name")]
    titles = [a.get("title", "") for a in articles[:2] if a.get("title")]

    rag_reply = str(rag_answer.get("answer") or "").strip()
    if rag_reply and not rag_reply.lower().startswith("offline mode:"):
        reply = rag_reply
    else:
        reply = _compose_heuristic_chat_reply(message, artifact)

    if titles:
        reply += f"\n\nRelevant ET reads: {', '.join(titles)}."
    if names:
        reply += f"\n\nGood ET starting points: {', '.join(names)}."
    return {
        "message": reply,
        "mode": "heuristic",
        "artifact": artifact,
    }


def _status_payload() -> dict[str, Any]:
    from .llm_provider import get_llm_provider, llm_available

    return {
        "status": "ok",
        "service": "et-ai-concierge",
        "provider": get_llm_provider(),
        "llm_available": llm_available(),
        "api_mode": "heuristic_default",
    }


def _json_response(handler: http.server.BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)


def serve_api(host: str = "127.0.0.1", port: int = 8000) -> None:
    _load_env()

    class ConciergeHandler(http.server.BaseHTTPRequestHandler):
        def _read_json(self) -> dict[str, Any]:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
            return json.loads(raw.decode("utf-8") or "{}")

        def _timed(self, fn: Any) -> tuple[Any, float]:
            started = time.perf_counter()
            result = fn()
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            return result, elapsed_ms

        def do_OPTIONS(self) -> None:  # noqa: N802
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_GET(self) -> None:  # noqa: N802
            if self.path in ("/api/status", "/health"):
                _json_response(self, 200, _status_payload())
                return

            _json_response(self, 404, {"error": "Not found"})

        def do_POST(self) -> None:  # noqa: N802
            if self.path not in ("/api/plan", "/api/message"):
                _json_response(self, 404, {"error": "Not found"})
                return

            try:
                payload = self._read_json()
            except json.JSONDecodeError:
                _json_response(self, 400, {"error": "Invalid JSON payload"})
                return

            if self.path == "/api/message":
                transcript = str(payload.get("transcript") or DEFAULT_CONVERSATION).strip()
                user_message = str(payload.get("message") or DEFAULT_RAG_Q).strip()
                use_live_llm = bool(payload.get("use_live_llm", False))
                if not user_message:
                    _json_response(self, 400, {"error": "message is required"})
                    return
                try:
                    result, elapsed_ms = self._timed(
                        lambda: run_chat_model(
                            conversation_transcript=transcript,
                            user_message=user_message,
                            use_live_llm=use_live_llm,
                        )
                    )
                except Exception as exc:  # pragma: no cover
                    _json_response(
                        self,
                        500,
                        {
                            "error": "Chat execution failed",
                            "detail": str(exc),
                        },
                    )
                    return

                _json_response(
                    self,
                    200,
                    {
                        "meta": {
                            "elapsed_ms": elapsed_ms,
                            "provider": _status_payload()["provider"],
                            "use_live_llm": use_live_llm,
                        },
                        "result": result,
                    },
                )
                return

            conversation = str(payload.get("conversation") or payload.get("transcript") or DEFAULT_CONVERSATION).strip()
            rag_query = str(payload.get("rag_query") or payload.get("message") or DEFAULT_RAG_Q).strip()
            skip_rag = bool(payload.get("skip_rag", False))
            use_live_llm = bool(payload.get("use_live_llm", False))
            try:
                result, elapsed_ms = self._timed(
                    lambda: run_model(
                        conversation_text=conversation,
                        user_query_for_rag=rag_query,
                        print_provider_hint=False,
                        skip_rag=skip_rag,
                        use_live_llm=use_live_llm,
                    )
                )
            except Exception as exc:  # pragma: no cover
                _json_response(
                    self,
                    500,
                    {
                        "error": "Pipeline execution failed",
                        "detail": str(exc),
                    },
                )
                return

            _json_response(
                self,
                200,
                {
                    "meta": {
                        "elapsed_ms": elapsed_ms,
                        "provider": _status_payload()["provider"],
                        "skip_rag": skip_rag,
                        "use_live_llm": use_live_llm,
                    },
                    "result": result,
                },
            )

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
            return

    class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True

    server = ThreadingHTTPServer((host, port), ConciergeHandler)
    print(f"ET AI Concierge API listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down API server...")
    finally:
        server.server_close()


def main(argv: list[str] | None = None) -> None:
    """CLI: runs the full ET AI Concierge stack."""
    _load_env()

    parser = argparse.ArgumentParser(
        description="ET AI Concierge — run the full concierge stack.",
    )
    parser.add_argument(
        "--conversation",
        type=str,
        help="User conversation text for profiling (default: sample conversation)",
    )
    parser.add_argument(
        "--no-hint",
        action="store_true",
        help="Do not print LLM provider / key hint line",
    )
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Run a local HTTP API that wraps the existing concierge pipeline",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host for --serve mode (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for --serve mode (default: 8000)",
    )
    args = parser.parse_args(argv if argv is not None else sys.argv[1:])

    if args.serve:
        serve_api(host=args.host, port=args.port)
        return

    if not args.no_hint:
        _print_provider_hint()

    conversation = args.conversation or DEFAULT_CONVERSATION
    out = run_model(conversation_text=conversation)
    print(json.dumps(out, indent=2, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
