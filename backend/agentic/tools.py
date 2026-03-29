"""
Registered tools — thin wrappers around **existing** pipeline entrypoints only.

Do not reimplement profiler/recommender logic here.
"""

from __future__ import annotations

from typing import Any, Optional

from ..ecosystem import sample_behavior_events
from ..orchestrator import (
    concierge_to_frontend_json,
    pipeline_to_frontend_json,
    run_concierge_pipeline,
    run_pipeline,
)
from ..schemas import BehaviorEvent, PersonaProfile


def tool_et_core_pipeline(
    *,
    conversation_text: str,
    user_query_for_rag: str,
    skip_rag: bool = False,
    prior_persona: Optional[PersonaProfile] = None,
    client: Any | None = None,
    rag_top_k: int = 5,
) -> dict[str, Any]:
    state = run_pipeline(
        conversation_text,
        user_query_for_rag,
        prior_persona=prior_persona,
        client=client,
        skip_rag=skip_rag,
        rag_top_k=rag_top_k,
    )
    return pipeline_to_frontend_json(state)


def tool_et_full_concierge(
    *,
    conversation_text: str,
    user_query_for_rag: str,
    skip_rag: bool = False,
    use_sample_behavior: bool = True,
    behavior_events: Optional[list[dict[str, Any]]] = None,
    prior_persona: Optional[PersonaProfile] = None,
    client: Any | None = None,
    rag_top_k: int = 5,
) -> dict[str, Any]:
    events: Optional[list[BehaviorEvent]] = None
    if behavior_events is not None:
        events = [BehaviorEvent.model_validate(e) for e in behavior_events]
    elif use_sample_behavior:
        events = sample_behavior_events()
    state = run_concierge_pipeline(
        conversation_text,
        user_query_for_rag,
        behavior_events=events,
        prior_persona=prior_persona,
        client=client,
        skip_rag=skip_rag,
        rag_top_k=rag_top_k,
    )
    return concierge_to_frontend_json(state)


TOOL_SPECS = """
Available tools (exact ``action`` string → call with ``tool_input`` JSON):

1) et_core_pipeline
   Run: profiler, recommender, RAG, dispatcher, explainability (existing ``run_pipeline``).
   tool_input keys: conversation_text (string, required), user_query_for_rag (string, required),
   skip_rag (boolean, optional, default false).

2) et_full_concierge
   Run: core pipeline PLUS financial navigator, ecosystem map, welcome script, cross-sell, marketplace.
   tool_input keys: same as et_core_pipeline. Optional skip_rag. Optional use_sample_behavior (bool, default true)
   to attach demo behavior events for cross-sell.

Always ground conversation_text in the user’s actual chat transcript when provided in context.
When the user only asks a narrow factual question, still supply a reasonable conversation_text
(can mirror user_query_for_rag) so the profiler has something to read.

To complete the session, respond with action \"finish\" and a helpful final_message summarizing outcomes
for the end user (plain language). You may mention that a structured plan JSON was produced without dumping raw JSON.
"""

TOOL_DISPATCH = {
    "et_core_pipeline": tool_et_core_pipeline,
    "et_full_concierge": tool_et_full_concierge,
}
