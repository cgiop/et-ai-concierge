"""
Agentic planner loop: model proposes tool calls → we execute **existing** pipelines → feed observations back.

Uses ``chat_json`` from ``llm_provider`` (Gemini or Grok via ``ET_LLM_PROVIDER``).
"""

from __future__ import annotations

import json
from typing import Any, Optional

from ..llm_provider import chat_json, default_model_for_provider, get_llm_provider, llm_available
from ..schemas import AgenticRunResult, AgenticStepRecord
from .tools import TOOL_DISPATCH, TOOL_SPECS

ORCHESTRATOR_SYSTEM = f"""You are the **ET AI Concierge agentic orchestrator**.
Your job is to help the user by calling **tools** that run the real ET pipelines (you cannot invent portfolio data).

{TOOL_SPECS}

**Protocol** — output **only** valid JSON each turn (no markdown):
{{
  "thought": "brief reasoning",
  "action": "et_core_pipeline" | "et_full_concierge" | "finish",
  "tool_input": {{ }},
  "final_message": "required when action is finish — user-facing summary in plain language"
}}

Rules:
- On ``finish``, set ``tool_input`` to {{}} and put the user summary in ``final_message``.
- Prefer **et_full_concierge** when the user should see ecosystem mapping, marketplace, or cross-sell.
- Prefer **et_core_pipeline** when they only need a lighter recommendation + RAG pass.
- After a tool runs you will receive an ``observation``; then usually choose **finish** with a concise summary unless data is clearly incomplete.
- One tool per turn; wait for observation before calling again.
"""


def run_agentic_concierge(
    user_goal: str,
    *,
    conversation_transcript: Optional[str] = None,
    max_steps: int = 5,
    client: Any | None = None,
    model_name: Optional[str] = None,
) -> AgenticRunResult:
    """
    Planner selects ``et_core_pipeline`` or ``et_full_concierge`` (wrappers around existing entrypoints).

    If no LLM is configured for the active provider, returns ``mode=error`` without calling tools.
    """
    provider = get_llm_provider()
    if not llm_available():
        return AgenticRunResult(
            provider_used=provider,
            mode="error",
            final_message=(
                "LLM not configured for the selected provider; set keys or call run_pipeline / "
                "run_concierge_pipeline directly."
            ),
            error_detail="llm_available() is False",
        )

    transcript = (conversation_transcript or user_goal).strip()
    scratch: list[dict[str, Any]] = []
    records: list[AgenticStepRecord] = []
    last_artifact: Optional[dict[str, Any]] = None
    model = model_name or default_model_for_provider()

    for _ in range(max_steps):
        user_block = {
            "user_goal": user_goal,
            "conversation_transcript_excerpt": transcript[:8000],
            "prior_steps": scratch,
            "instruction": (
                "Choose the next action. If prior_steps already contains a successful observation, "
                "finish with final_message unless something material is missing."
            ),
        }
        data = chat_json(
            ORCHESTRATOR_SYSTEM,
            json.dumps(user_block, ensure_ascii=False),
            client=client,
            model_name=model,
        )
        action = str(data.get("action") or "").strip()
        thought = str(data.get("thought") or "")
        tool_input = data.get("tool_input") if isinstance(data.get("tool_input"), dict) else {}

        if action == "finish":
            msg = str(data.get("final_message") or data.get("message") or "").strip() or "Done."
            records.append(
                AgenticStepRecord(
                    thought=thought,
                    action="finish",
                    tool_input={},
                    observation_summary=msg[:800],
                )
            )
            return AgenticRunResult(
                provider_used=provider,
                steps=records,
                final_message=msg,
                mode="finished",
                last_artifact=last_artifact,
            )

        fn = TOOL_DISPATCH.get(action)
        if fn is None:
            return AgenticRunResult(
                provider_used=provider,
                mode="error",
                error_detail=f"Unknown action: {action!r}",
                final_message="The planner proposed an unknown tool.",
                steps=records,
                last_artifact=last_artifact,
            )

        ct = str(tool_input.get("conversation_text") or transcript).strip()
        uq = str(tool_input.get("user_query_for_rag") or user_goal).strip()
        skip = bool(tool_input.get("skip_rag", False))

        try:
            if action == "et_core_pipeline":
                obs = fn(
                    conversation_text=ct,
                    user_query_for_rag=uq,
                    skip_rag=skip,
                    client=client,
                )
            else:
                use_sample = bool(tool_input.get("use_sample_behavior", True))
                obs = fn(
                    conversation_text=ct,
                    user_query_for_rag=uq,
                    skip_rag=skip,
                    use_sample_behavior=use_sample,
                    client=client,
                )
        except Exception as e:  # pragma: no cover
            return AgenticRunResult(
                provider_used=provider,
                mode="error",
                error_detail=str(e),
                final_message="A tool run failed.",
                steps=records,
                last_artifact=last_artifact,
            )

        last_artifact = obs if isinstance(obs, dict) else None
        obs_summary = json.dumps(
            {"ok": True, "top_keys": list(obs.keys()) if isinstance(obs, dict) else []},
            ensure_ascii=False,
        )
        scratch.append(
            {
                "thought": thought,
                "action": action,
                "observation": f"{obs_summary}; bytes~{len(json.dumps(obs, default=str))}",
            }
        )
        records.append(
            AgenticStepRecord(
                thought=thought,
                action=action,
                tool_input={
                    "conversation_text": (ct[:200] + "…") if len(ct) > 200 else ct,
                    "user_query_for_rag": uq,
                    "skip_rag": skip,
                },
                observation_summary=obs_summary,
            )
        )

    return AgenticRunResult(
        provider_used=provider,
        steps=records,
        mode="max_steps",
        final_message="Step limit reached; see last_artifact for the latest structured output.",
        last_artifact=last_artifact,
    )
