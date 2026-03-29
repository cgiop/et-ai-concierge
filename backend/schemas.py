"""Structured JSON types for the multi-agent GenAI pipeline."""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class RiskAppetite(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class PersonaType(str, Enum):
    BEGINNER_INVESTOR = "Beginner Investor"
    ACTIVE_TRADER = "Active Trader"
    WEALTH_BUILDER = "Wealth Builder"
    LOAN_SEEKER = "Loan Seeker"


class IncomeLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class PersonaProfile(BaseModel):
    """Output of the Profiler Agent."""

    persona_type: PersonaType = Field(description="Primary user archetype")
    risk_appetite: RiskAppetite
    risk_score: int = Field(ge=0, le=10, description="0–10 mapped to Low/Med/High in prompts")
    financial_goals: list[str] = Field(max_length=3, description="Up to 3 goals")
    income_level: Optional[IncomeLevel] = None
    adaptive_followups: list[str] = Field(
        default_factory=list,
        description="Next questions to refine the profile",
    )
    profiler_reasoning: str = Field(
        default="",
        description="Short inner monologue: how the persona was inferred",
    )


class ETProductSuggestion(BaseModel):
    id: str
    name: str
    category: str
    risk_alignment: RiskAppetite
    summary: str
    why_it_fits: str


class FinancialAction(BaseModel):
    title: str
    description: str
    timeframe: Literal["immediate", "short_term", "long_term"]
    priority: Literal["high", "medium", "low"]


class RecommendationBundle(BaseModel):
    """Output of the Recommendation Agent."""

    recommended_products: list[ETProductSuggestion] = Field(min_length=1, max_length=5)
    recommended_actions: list[FinancialAction] = Field(min_length=1, max_length=3)
    recommendation_reasoning: str = Field(
        default="",
        description="High-level trace for the bundle",
    )


class RagCitation(BaseModel):
    article_id: str
    title: str
    type: str


class RagAnswer(BaseModel):
    """Output of the Pulse / RAG synthesis step."""

    answer: str
    balanced_note: Optional[str] = Field(
        default=None,
        description="If sources conflict, how we balanced them",
    )
    citations: list[RagCitation] = Field(default_factory=list)
    rag_reasoning: str = Field(
        default="",
        description="Why these articles were relevant / how synthesis worked",
    )


class SimulatedChannel(str, Enum):
    SMS = "sms"
    EMAIL = "email"
    SAVE_PLAN = "save_plan"


class DispatchedAction(BaseModel):
    channel: SimulatedChannel
    payload: dict[str, Any]
    status: Literal["simulated_ok", "simulated_pending", "sent", "failed", "skipped"]
    provider_mock: str = Field(default="mock", description="Delivery provider, e.g. twilio, smtp, twilio_mock")
    error_detail: Optional[str] = None


class ActionDispatchResult(BaseModel):
    """Output of the Action Dispatcher (JSON function calls / mock APIs)."""

    actions: list[DispatchedAction]
    dispatcher_reasoning: str = ""


class ItemReasoning(BaseModel):
    item_id: str
    kind: Literal["product", "action", "rag"]
    trace: str


class ExplainabilityBundle(BaseModel):
    """Side-panel inner monologue for demo."""

    item_traces: list[ItemReasoning]
    global_summary: str


class PipelineState(BaseModel):
    """End-to-end output for the frontend."""

    persona: PersonaProfile
    recommendations: RecommendationBundle
    rag: Optional[RagAnswer] = None
    dispatch: ActionDispatchResult
    explainability: ExplainabilityBundle


# --- ET hackathon extensions: Welcome Concierge, Navigator, Cross-sell, Marketplace ---


class FinancialLifeNavigatorResult(BaseModel):
    """Deep conversational understanding: gaps, needs, ET surfaces (Financial Life Navigator)."""

    portfolio_gaps: list[str] = Field(
        default_factory=list,
        description="e.g. missing emergency fund, concentration risk, tax inefficiency",
    )
    immediate_needs: list[str] = Field(
        default_factory=list,
        description="What to solve in next 30–60 days",
    )
    life_priorities: list[str] = Field(
        default_factory=list,
        description="3–5 priorities inferred from the full chat",
    )
    suggested_et_surfaces: list[str] = Field(
        default_factory=list,
        description="ET apps/sections to route the user toward",
    )
    et_familiarity: Optional[str] = Field(
        default=None,
        description="e.g. new_to_et, casual_reader, power_user",
    )
    navigator_reasoning: str = ""


class EcosystemTouchpoint(BaseModel):
    """One ranked item in the ET ecosystem map."""

    touchpoint_id: str
    pillar: str = Field(description="content | markets | learning | events | partner_services")
    name: str
    priority_rank: int = Field(ge=1, le=20)
    why_for_this_user: str
    urgency: Literal["now", "this_week", "this_month"]
    cta: str


class OnboardingPhase(BaseModel):
    """Single ~1-minute beat within the 3-minute welcome flow."""

    phase_id: str
    title: str
    estimated_seconds: int = Field(ge=30, le=120)
    objectives: list[str] = Field(default_factory=list)
    host_prompts: list[str] = Field(
        default_factory=list,
        description="What voice/chat host should cover",
    )
    ecosystem_ids: list[str] = Field(
        default_factory=list,
        description="IDs from et_ecosystem_catalog.json",
    )


class OnboardingPath(BaseModel):
    """Personalized 3-minute style onboarding path across ET."""

    headline: str
    total_estimated_seconds: int = Field(default=180, description="Target ~180s welcome concierge")
    phases: list[OnboardingPhase] = Field(min_length=1, max_length=5)


class EcosystemOnboardingMap(BaseModel):
    """Maps profile → full ET ecosystem + structured onboarding (Welcome Concierge)."""

    prioritized_touchpoints: list[EcosystemTouchpoint] = Field(default_factory=list)
    onboarding_path: OnboardingPath
    mapper_reasoning: str = ""


class WelcomePhaseBeat(BaseModel):
    phase_id: str
    host_script: str
    listening_cues: list[str] = Field(default_factory=list)


class WelcomeConciergeScript(BaseModel):
    """Voice/chat-ready script beats for ~3-minute profiling welcome."""

    opening_line: str
    closing_line: str
    phase_beats: list[WelcomePhaseBeat] = Field(default_factory=list)
    script_reasoning: str = ""


class BehaviorEvent(BaseModel):
    """Signals from ET touchpoints for proactive cross-sell (Ecosystem Cross-Sell Engine)."""

    event_id: str = ""
    surface: str = Field(description="et_app | prime | markets | email | masterclass | events")
    event_type: str = Field(description="page_view | article_read | watchlist_add | trial_window | cart_abandon")
    subject_id: str = ""
    occurred_at_iso: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class CrossSellOpportunity(BaseModel):
    opportunity_id: str
    title: str
    channel: str = Field(description="push | email | in_app | sms | concierge_dm")
    trigger_summary: str
    pitch: str
    priority: int = Field(ge=1, le=10)
    related_catalog_ids: list[str] = Field(default_factory=list)


class CrossSellBundle(BaseModel):
    opportunities: list[CrossSellOpportunity] = Field(default_factory=list)
    engine_reasoning: str = ""


class MarketplaceOfferSuggestion(BaseModel):
    """Partner financial services (ET Services Marketplace Agent)."""

    catalog_id: str
    category: Literal["credit_card", "loan", "insurance", "wealth"]
    product_name: str
    fit_summary: str
    next_step: str


class MarketplaceBundle(BaseModel):
    offers: list[MarketplaceOfferSuggestion] = Field(default_factory=list)
    compliance_disclaimer: str = (
        "Illustrative partner offers for demo. Not financial advice; "
        "eligibility and terms apply with issuing partners."
    )
    marketplace_reasoning: str = ""


class ConciergeState(BaseModel):
    """Full stack aligned with ET AI Concierge problem statement."""

    core: PipelineState
    financial_life: FinancialLifeNavigatorResult
    ecosystem: EcosystemOnboardingMap
    welcome_script: WelcomeConciergeScript
    cross_sell: CrossSellBundle
    marketplace: MarketplaceBundle


class AgenticStepRecord(BaseModel):
    """One agentic planner turn + optional tool observation."""

    thought: str = ""
    action: str = ""
    tool_input: dict[str, Any] = Field(default_factory=dict)
    observation_summary: str = ""


class AgenticRunResult(BaseModel):
    """Result of optional agentic orchestration (``run_agentic_concierge``)."""

    provider_used: str = ""
    steps: list[AgenticStepRecord] = Field(default_factory=list)
    final_message: str = ""
    mode: Literal["finished", "max_steps", "error"] = "finished"
    error_detail: Optional[str] = None
    last_artifact: Optional[dict[str, Any]] = None
