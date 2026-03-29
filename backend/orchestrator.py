"""Pipeline orchestration + action dispatcher (mock SMS/email/save-plan)."""

from __future__ import annotations

import os
import uuid
from typing import Any, Optional

from . import agents
from . import rag as rag_mod
from .schemas import (
    ActionDispatchResult,
    BehaviorEvent,
    ConciergeState,
    DispatchedAction,
    PersonaProfile,
    PipelineState,
    RagAnswer,
    RecommendationBundle,
    SimulatedChannel,
)


def dispatch_actions(
    persona: PersonaProfile,
    recs: RecommendationBundle,
    *,
    enable_sms: bool = True,
    enable_email: bool = True,
    enable_save: bool = True,
) -> ActionDispatchResult:
    """Convert recommendations into JSON-shaped mock API calls (Twilio/SMTP/save)."""
    top_products = ", ".join(p.name for p in recs.recommended_products[:3])
    actions: list[DispatchedAction] = []
    reasoning_parts: list[str] = []

    if enable_save:
        plan_id = str(uuid.uuid4())[:8]
        actions.append(
            DispatchedAction(
                channel=SimulatedChannel.SAVE_PLAN,
                payload={
                    "function": "save_financial_plan",
                    "plan_id": plan_id,
                    "persona_snapshot": persona.model_dump(mode="json"),
                    "product_ids": [p.id for p in recs.recommended_products],
                },
                status="simulated_ok",
                provider_mock="et_internal_api_mock",
            )
        )
        reasoning_parts.append(f"Persisted plan {plan_id} for later review.")

    if enable_sms:
        msg = (
            f"ET Concierge: Hi — based on your {persona.risk_appetite.value} risk profile, "
            f"review: {top_products}. Reply STOP to opt out."
        )
        actions.append(
            DispatchedAction(
                channel=SimulatedChannel.SMS,
                payload={
                    "function": "send_sms",
                    "to": os.getenv("ET_MOCK_SMS_TO", "+919999000000"),
                    "body": msg[:320],
                    "provider": "twilio_mock",
                },
                status="simulated_pending",
                provider_mock="twilio_mock",
            )
        )
        reasoning_parts.append("Queued SMS digest of top products (mock Twilio).")

    if enable_email:
        actions.append(
            DispatchedAction(
                channel=SimulatedChannel.EMAIL,
                payload={
                    "function": "send_email",
                    "to": os.getenv("ET_MOCK_EMAIL_TO", "user@example.com"),
                    "subject": "Your ET AI Concierge plan",
                    "html_preview": f"<p>Goals: {', '.join(persona.financial_goals)}</p><p>{top_products}</p>",
                    "provider": "smtp_mock",
                },
                status="simulated_pending",
                provider_mock="smtp_mock",
            )
        )
        reasoning_parts.append("Queued email with goals + product shortlist.")

    return ActionDispatchResult(
        actions=actions,
        dispatcher_reasoning=" ".join(reasoning_parts),
    )


def run_pipeline(
    conversation_text: str,
    user_query_for_rag: str,
    *,
    prior_persona: Optional[PersonaProfile] = None,
    client: Any | None = None,
    rag_top_k: int = 5,
    skip_rag: bool = False,
) -> PipelineState:
    """
    End-to-end flow: Profiler → Recommender → RAG → Dispatcher → Explainability.

    If no API key is set for the active ``ET_LLM_PROVIDER`` (Gemini or Grok), agents fall back to heuristics.
    """
    persona = agents.run_profiler(conversation_text, prior_persona=prior_persona, client=client)
    recs = agents.run_recommender(persona, client=client)

    rag_ans: RagAnswer | None = None
    if not skip_rag:
        hits = rag_mod.search_articles(user_query_for_rag, top_k=rag_top_k)
        excerpts = rag_mod.format_excerpts_for_llm(hits)
        rag_ans = agents.run_rag_synthesis(user_query_for_rag, excerpts, client=client)

    dispatch = dispatch_actions(persona, recs)
    explain = agents.run_explainability(persona, recs, rag_ans, client=client)

    return PipelineState(
        persona=persona,
        recommendations=recs,
        rag=rag_ans,
        dispatch=dispatch,
        explainability=explain,
    )


def pipeline_to_frontend_json(state: PipelineState) -> dict:
    """Flat, demo-friendly dict for Flask/Node to forward to the UI."""
    return {
        "persona": state.persona.model_dump(mode="json"),
        "recommendations": state.recommendations.model_dump(mode="json"),
        "rag": state.rag.model_dump(mode="json") if state.rag else None,
        "dispatch": state.dispatch.model_dump(mode="json"),
        "explainability": state.explainability.model_dump(mode="json"),
    }


def run_concierge_pipeline(
    conversation_text: str,
    user_query_for_rag: str,
    *,
    behavior_events: Optional[list[BehaviorEvent]] = None,
    prior_persona: PersonaProfile | None = None,
    client: Any | None = None,
    rag_top_k: int = 5,
    skip_rag: bool = False,
) -> ConciergeState:
    """
    Full ET Concierge: core ``run_pipeline`` plus navigator, ecosystem map, welcome script,
    cross-sell, marketplace.
    """
    from .ecosystem import (
        filter_by_persona,
        format_catalog_for_llm,
        load_ecosystem_catalog,
        partner_offers_only,
        run_cross_sell,
        run_ecosystem_onboarding_map,
        run_financial_navigator,
        run_marketplace,
        run_welcome_script,
    )

    core = run_pipeline(
        conversation_text,
        user_query_for_rag,
        prior_persona=prior_persona,
        client=client,
        rag_top_k=rag_top_k,
        skip_rag=skip_rag,
    )
    persona = core.persona
    catalog = load_ecosystem_catalog()
    ranked = filter_by_persona(catalog, persona.persona_type.value, limit=28)
    catalog_excerpt = format_catalog_for_llm(ranked)

    navigator = run_financial_navigator(conversation_text, persona, client=client)
    ecosystem = run_ecosystem_onboarding_map(persona, navigator, catalog_excerpt, client=client)
    welcome = run_welcome_script(persona, ecosystem, client=client)
    cross = run_cross_sell(
        persona, navigator, behavior_events, catalog_excerpt, client=client
    )

    partners = partner_offers_only(catalog)
    partner_ranked = filter_by_persona(partners, persona.persona_type.value, limit=20)
    partner_excerpt = format_catalog_for_llm(partner_ranked, max_items=20)
    marketplace = run_marketplace(persona, navigator, partner_excerpt, client=client)

    return ConciergeState(
        core=core,
        financial_life=navigator,
        ecosystem=ecosystem,
        welcome_script=welcome,
        cross_sell=cross,
        marketplace=marketplace,
    )


def concierge_to_frontend_json(state: ConciergeState) -> dict:
    return {
        "core": {
            "persona": state.core.persona.model_dump(mode="json"),
            "recommendations": state.core.recommendations.model_dump(mode="json"),
            "rag": state.core.rag.model_dump(mode="json") if state.core.rag else None,
            "dispatch": state.core.dispatch.model_dump(mode="json"),
            "explainability": state.core.explainability.model_dump(mode="json"),
        },
        "financial_life": state.financial_life.model_dump(mode="json"),
        "ecosystem": state.ecosystem.model_dump(mode="json"),
        "welcome_script": state.welcome_script.model_dump(mode="json"),
        "cross_sell": state.cross_sell.model_dump(mode="json"),
        "marketplace": state.marketplace.model_dump(mode="json"),
    }
