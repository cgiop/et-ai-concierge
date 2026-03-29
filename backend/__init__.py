"""
ET AI Concierge — full concierge stack with GenAI pipeline (Gemini or Grok via ``ET_LLM_PROVIDER``).

Public entrypoints:
- ``run_concierge_pipeline`` — full concierge with all components
- ``run_pipeline`` — core pipeline only
- ``run_agentic_concierge`` — tool-calling planner (advanced)
"""

from .agents import run_explainability, run_profiler, run_rag_synthesis, run_recommender
from .agentic import run_agentic_concierge
from .ecosystem import sample_behavior_events
from .launcher import run_model
from .llm_provider import chat_json as llm_chat_json
from .llm_provider import default_model_for_provider, get_llm_provider, llm_available
from .orchestrator import (
    concierge_to_frontend_json,
    dispatch_actions,
    pipeline_to_frontend_json,
    run_concierge_pipeline,
    run_pipeline,
)
from .rag import format_excerpts_for_llm, load_knowledge_base, search_articles
from .schemas import (
    ActionDispatchResult,
    AgenticRunResult,
    AgenticStepRecord,
    BehaviorEvent,
    ConciergeState,
    ExplainabilityBundle,
    PersonaProfile,
    PipelineState,
    RagAnswer,
    RecommendationBundle,
)

__all__ = [
    "run_pipeline",
    "run_concierge_pipeline",
    "run_model",
    "run_agentic_concierge",
    "pipeline_to_frontend_json",
    "concierge_to_frontend_json",
    "get_llm_provider",
    "llm_available",
    "default_model_for_provider",
    "llm_chat_json",
    "AgenticRunResult",
    "AgenticStepRecord",
    "dispatch_actions",
    "run_profiler",
    "run_recommender",
    "run_rag_synthesis",
    "run_explainability",
    "sample_behavior_events",
    "load_knowledge_base",
    "search_articles",
    "format_excerpts_for_llm",
    "PersonaProfile",
    "RecommendationBundle",
    "RagAnswer",
    "PipelineState",
    "ConciergeState",
    "BehaviorEvent",
    "ActionDispatchResult",
    "ExplainabilityBundle",
]
