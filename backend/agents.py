"""LLM-backed agents (Profiler, Recommender, RAG synthesis, Explainability) — JSON via pluggable LLM backend."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from . import prompts as P
from .llm_provider import chat_json as _provider_chat_json
from .llm_provider import llm_available

_REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_REPO_ROOT / ".env")
from .schemas import (
    ExplainabilityBundle,
    ItemReasoning,
    PersonaProfile,
    PersonaType,
    RagAnswer,
    RecommendationBundle,
    RiskAppetite,
)


def _gemini_ready() -> bool:
    """Backward-compatible name: true when the active provider (Gemini or Grok) can call the LLM."""
    return llm_available()


def _chat_json(
    system: str,
    user: str,
    *,
    client: Any | None = None,
    model_name: str | None = None,
) -> dict[str, Any]:
    return _provider_chat_json(system, user, client=client, model_name=model_name)


def _heuristic_persona(text: str) -> PersonaProfile:
    t = text.lower()
    low = sum(1 for w in ("safe", "fd", "low risk", "first time", "new to", "conservative", "steady") if w in t)
    high = sum(1 for w in ("trading", "trade", "trader", "fno", "f&o", "options", "crypto", "aggressive", "high risk", "quick money", "volatile", "speculate") if w in t)
    loan = sum(1 for w in ("loan", "emi", "home loan", "credit") if w in t)
    if loan >= 1:
        ptype = PersonaType.LOAN_SEEKER
    elif high > low:
        ptype = PersonaType.ACTIVE_TRADER
    elif "sip" in t or "long" in t or "retirement" in t:
        ptype = PersonaType.WEALTH_BUILDER
    else:
        ptype = PersonaType.BEGINNER_INVESTOR
    risk: RiskAppetite = RiskAppetite.MEDIUM
    score = 5
    if high > low + 1:
        risk, score = RiskAppetite.HIGH, 8
    elif low > high + 1:
        risk, score = RiskAppetite.LOW, 3
    goals: list[str] = []
    if "retire" in t or "retirement" in t:
        goals.append("retirement planning")
    if "tax" in t:
        goals.append("tax saving")
    if "home" in t or "house" in t:
        goals.append("buy a home")
    if "education" in t or "child" in t:
        goals.append("child education")
    if not goals:
        goals = ["build emergency fund", "start investing"]
    return PersonaProfile(
        persona_type=ptype,
        risk_appetite=risk,
        risk_score=score,
        financial_goals=goals[:3],
        income_level=None,
        adaptive_followups=[
            "What is your investment horizon: less than 3 years or more?",
            "Do you have any existing loans or EMIs?",
        ],
        profiler_reasoning="Heuristic fallback: keyword cues mapped to persona and risk when no LLM is available.",
    )


def run_profiler(
    conversation_text: str,
    prior_persona: PersonaProfile | None = None,
    client: Any | None = None,
) -> PersonaProfile:
    if not _gemini_ready() and client is None:
        return _heuristic_persona(conversation_text)
    prior = prior_persona.model_dump_json() if prior_persona else None
    user = P.user_profiler_payload(conversation_text, prior)
    try:
        data = _chat_json(P.PROFILER_SYSTEM, user, client=client)
        return PersonaProfile.model_validate(data)
    except Exception:
        return _heuristic_persona(conversation_text)


def run_recommender(persona: PersonaProfile, client: Any | None = None) -> RecommendationBundle:
    if not _gemini_ready() and client is None:
        return _mock_recommendations(persona)
    user = P.user_recommender_payload(persona.model_dump_json())
    try:
        data = _chat_json(P.RECOMMENDER_SYSTEM, user, client=client)
        return RecommendationBundle.model_validate(data)
    except Exception:
        return _mock_recommendations(persona)


def run_rag_synthesis(user_query: str, article_excerpts: str, client: Any | None = None) -> RagAnswer:
    if not _gemini_ready() and client is None:
        return RagAnswer(
            answer="Offline mode: align your plan with diversified SIPs and match equity exposure to your risk score.",
            balanced_note=None,
            citations=[],
            rag_reasoning="Mock RAG: no LLM API key for active provider; returning generic prudent guidance.",
        )
    user = P.user_rag_payload(user_query, article_excerpts)
    try:
        data = _chat_json(P.RAG_SYNTHESIS_SYSTEM, user, client=client)
        return RagAnswer.model_validate(data)
    except Exception:
        return RagAnswer(
            answer="Offline mode: align your plan with diversified SIPs and match equity exposure to your risk score.",
            balanced_note=None,
            citations=[],
            rag_reasoning="Mock RAG: API error; returning generic prudent guidance.",
        )


def run_explainability(
    persona: PersonaProfile,
    recs: RecommendationBundle,
    rag: RagAnswer | None,
    client: Any | None = None,
) -> ExplainabilityBundle:
    if not _gemini_ready() and client is None:
        traces: list[ItemReasoning] = []
        for p in recs.recommended_products:
            traces.append(
                ItemReasoning(
                    item_id=p.id,
                    kind="product",
                    trace=f"Selected {p.name} because persona risk is {persona.risk_appetite.value}.",
                )
            )
        for a in recs.recommended_actions:
            slug = a.title.lower().replace(" ", "_")[:48]
            traces.append(
                ItemReasoning(
                    item_id=slug,
                    kind="action",
                    trace=a.description[:200],
                )
            )
        if rag:
            traces.append(
                ItemReasoning(
                    item_id="rag_answer",
                    kind="rag",
                    trace=rag.rag_reasoning or "Pulse agent synthesis.",
                )
            )
        return ExplainabilityBundle(
            item_traces=traces,
            global_summary="Explainability fallback: rule-based traces for demo without LLM.",
        )
    rag_j = rag.model_dump_json() if rag else None
    user = P.user_explain_payload(persona.model_dump_json(), recs.model_dump_json(), rag_j)
    try:
        data = _chat_json(P.EXPLAINABILITY_SYSTEM, user, client=client)
        return ExplainabilityBundle.model_validate(data)
    except Exception:
        traces: list[ItemReasoning] = []
        for p in recs.recommended_products:
            traces.append(
                ItemReasoning(
                    item_id=p.id,
                    kind="product",
                    trace=f"Selected {p.name} because persona risk is {persona.risk_appetite.value}.",
                )
            )
        for a in recs.recommended_actions:
            slug = a.title.lower().replace(" ", "_")[:48]
            traces.append(
                ItemReasoning(
                    item_id=slug,
                    kind="action",
                    trace=a.description[:200],
                )
            )
        if rag:
            traces.append(
                ItemReasoning(
                    item_id="rag_answer",
                    kind="rag",
                    trace=rag.rag_reasoning or "Pulse agent synthesis.",
                )
            )
        return ExplainabilityBundle(
            item_traces=traces,
            global_summary="Explainability fallback: API error; rule-based traces.",
        )


def _mock_recommendations(persona: PersonaProfile) -> RecommendationBundle:
    from .schemas import ETProductSuggestion, FinancialAction

    risk = persona.risk_appetite
    products: list[ETProductSuggestion] = [
        ETProductSuggestion(
            id="et_sip_starter",
            name="Index-aware SIP basket",
            category="Mutual funds",
            risk_alignment=RiskAppetite.MEDIUM,
            summary="Diversified SIPs with low-cost index tilt.",
            why_it_fits=f"Matches a {persona.persona_type.value} profile with {risk.value} risk.",
        ),
        ETProductSuggestion(
            id="et_tax_saver",
            name="ELSS tax saver fund shortlist",
            category="Tax planning",
            risk_alignment=RiskAppetite.MEDIUM,
            summary="Section 80C oriented funds with 3-year lock-in.",
            why_it_fits="Useful if tax saving appeared in goals or beginner journey.",
        ),
    ]
    if risk.value == "High":
        products.append(
            ETProductSuggestion(
                id="et_direct_equity",
                name="Direct equity research toolkit",
                category="Equity",
                risk_alignment=RiskAppetite.HIGH,
                summary="ET Markets screens & portfolio tracking.",
                why_it_fits="Higher risk appetite suggests willingness for equity volatility.",
            )
        )
    if persona.persona_type.value == "Loan Seeker":
        products.append(
            ETProductSuggestion(
                id="et_loan_calc",
                name="Home loan EMI comparator",
                category="Loans",
                risk_alignment=RiskAppetite.LOW,
                summary="Compare rates and optimize tenure.",
                why_it_fits="Loan seeker persona prioritizes liability planning.",
            )
        )

    actions = [
        FinancialAction(
            title="Automate monthly SIP",
            description="Set a SIP amount you will not skip; increase 10% yearly.",
            timeframe="immediate",
            priority="high",
        ),
        FinancialAction(
            title="Build 6-month emergency corpus",
            description="Park in liquid or ultra-short funds before raising equity share.",
            timeframe="short_term",
            priority="high",
        ),
    ]
    if risk.value == "Low":
        actions.append(
            FinancialAction(
                title="Review debt allocation",
                description="Shift incremental savings to short-duration debt if horizon < 3 years.",
                timeframe="short_term",
                priority="medium",
            )
        )

    return RecommendationBundle(
        recommended_products=products[:5],
        recommended_actions=actions[:3],
        recommendation_reasoning="Mock bundle tuned to persona risk and type (no LLM).",
    )
