"""
Pluggable LLM backend for JSON chat completions.

- ``gemini`` (default): ``google.generativeai`` — unchanged behavior when ``ET_LLM_PROVIDER`` unset.
- ``grok``: xAI OpenAI-compatible API (``https://api.x.ai/v1``).

Existing agents call ``chat_json``; pipelines stay the same.
"""

from __future__ import annotations

import json
import os
from typing import Any

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore

GROK_BASE_URL = os.getenv("GROK_API_BASE", "https://api.x.ai/v1").strip() or "https://api.x.ai/v1"


def get_llm_provider() -> str:
    p = os.getenv("ET_LLM_PROVIDER", "gemini").strip().lower()
    return p or "gemini"


def _strip_json_fences(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        for prefix in ("```json", "```JSON", "```"):
            if s.startswith(prefix):
                s = s[len(prefix) :].strip()
                break
        if s.endswith("```"):
            s = s[:-3].strip()
    return s


def _gemini_response_text(response: Any) -> str:
    try:
        t = response.text
        if t:
            return t
    except (ValueError, AttributeError):
        pass
    if not getattr(response, "candidates", None):
        return ""
    parts = getattr(response.candidates[0].content, "parts", None) or []
    if not parts:
        return ""
    return getattr(parts[0], "text", "") or ""


def _gemini_api_key() -> str:
    return (
        os.getenv("GEMINI_API_KEY", "").strip()
        or os.getenv("GOOGLE_API_KEY", "").strip()
    )


def _grok_api_key() -> str:
    return (os.getenv("XAI_API_KEY", "").strip() or os.getenv("GROK_API_KEY", "").strip())


def default_model_for_provider(provider: str | None = None) -> str:
    p = (provider or get_llm_provider()).lower()
    if p == "grok":
        return os.getenv("GROK_MODEL", os.getenv("ET_AI_MODEL", "grok-2-latest"))
    return os.getenv("GEMINI_MODEL", os.getenv("ET_AI_MODEL", "gemini-2.0-flash"))


def resolve_model_name(
    client: Any | None,
    model_name: str | None,
    provider: str | None = None,
) -> str:
    if isinstance(client, str) and client.strip():
        return client.strip()
    if model_name:
        return model_name
    return default_model_for_provider(provider)


def llm_available() -> bool:
    """True if the configured provider has SDK + API key present."""
    p = get_llm_provider()
    if p == "grok":
        return OpenAI is not None and bool(_grok_api_key())
    # gemini (default)
    return genai is not None and bool(_gemini_api_key())


def _chat_json_gemini(
    system: str,
    user: str,
    *,
    client: Any | None,
    model_name: str | None,
) -> dict[str, Any]:
    if genai is None:
        raise RuntimeError("Install google-generativeai for Gemini backend")
    key = _gemini_api_key()
    if not key:
        raise RuntimeError("Set GEMINI_API_KEY or GOOGLE_API_KEY for Gemini backend")
    genai.configure(api_key=key)
    name = resolve_model_name(client, model_name, "gemini")
    model = genai.GenerativeModel(
        model_name=name,
        system_instruction=system,
    )
    response = model.generate_content(
        user,
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )
    raw = _gemini_response_text(response) or "{}"
    return json.loads(_strip_json_fences(raw))


def _chat_json_grok(
    system: str,
    user: str,
    *,
    client: Any | None,
    model_name: str | None,
) -> dict[str, Any]:
    if OpenAI is None:
        raise RuntimeError("Install openai package for Grok backend: pip install openai")
    key = _grok_api_key()
    if not key:
        raise RuntimeError("Set XAI_API_KEY or GROK_API_KEY for Grok backend")
    name = resolve_model_name(client, model_name, "grok")
    # Optional: user passes pre-built OpenAI client via module-specific hook — not used by pipelines today.
    oai = OpenAI(api_key=key, base_url=GROK_BASE_URL)
    resp = oai.chat.completions.create(
        model=name,
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    raw = (resp.choices[0].message.content or "{}").strip()
    return json.loads(_strip_json_fences(raw))


def chat_json(
    system: str,
    user: str,
    *,
    client: Any | None = None,
    model_name: str | None = None,
) -> dict[str, Any]:
    p = get_llm_provider()
    if p == "grok":
        return _chat_json_grok(system, user, client=client, model_name=model_name)
    if p in ("gemini", "google"):
        return _chat_json_gemini(system, user, client=client, model_name=model_name)
    raise ValueError(f"Unknown ET_LLM_PROVIDER={p!r}; use 'gemini', 'google', or 'grok'")
