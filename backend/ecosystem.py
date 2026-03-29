"""
ET ecosystem layer: catalog data, Financial Life Navigator, onboarding map,
welcome script, cross-sell, and marketplace — single module to avoid scattered duplicates.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from . import prompts as P
from .agents import _chat_json, _gemini_ready
from .schemas import (
    BehaviorEvent,
    CrossSellBundle,
    CrossSellOpportunity,
    EcosystemOnboardingMap,
    EcosystemTouchpoint,
    FinancialLifeNavigatorResult,
    MarketplaceBundle,
    MarketplaceOfferSuggestion,
    OnboardingPath,
    OnboardingPhase,
    PersonaProfile,
    WelcomeConciergeScript,
    WelcomePhaseBeat,
)

# --- Catalog (et_ecosystem_catalog.json) ---

_DATA_DIR = Path(__file__).resolve().parent / "data"
_ECOSYSTEM_JSON = _DATA_DIR / "et_ecosystem_catalog.json"


def load_ecosystem_catalog(path: Path | None = None) -> list[dict[str, Any]]:
    p = path or _ECOSYSTEM_JSON
    with p.open(encoding="utf-8") as f:
        data = json.load(f)
    items = data.get("offerings")
    if not isinstance(items, list):
        raise ValueError("et_ecosystem_catalog.json must have an 'offerings' array")
    return items


def filter_by_persona(
    offerings: list[dict[str, Any]],
    persona_type_value: str,
    limit: int = 24,
) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    rest: list[dict[str, Any]] = []
    for o in offerings:
        fit = o.get("persona_fit") or []
        if isinstance(fit, list) and persona_type_value in fit:
            hits.append(o)
        else:
            rest.append(o)
    return (hits + rest)[:limit]


def partner_offers_only(offerings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [o for o in offerings if o.get("pillar") == "partner_services"]


def format_catalog_for_llm(
    offerings: list[dict[str, Any]],
    max_items: int = 28,
) -> str:
    lines: list[str] = []
    for o in offerings[:max_items]:
        pc = o.get("partner_category") or ""
        lines.append(
            f"- id={o.get('id')} pillar={o.get('pillar')} name={o.get('name')!r} "
            f"partner_category={pc} tags={o.get('tags')} summary={o.get('summary','')[:220]}"
        )
    return "\n".join(lines)


# --- Financial Life Navigator ---


def _heuristic_navigator(conversation_text: str, persona: PersonaProfile) -> FinancialLifeNavigatorResult:
    t = conversation_text.lower()
    gaps = []
    if "emergency" not in t and "buffer" not in t:
        gaps.append("Emergency liquidity plan unclear")
    if "insurance" not in t and "term" not in t:
        gaps.append("Protection / term cover not confirmed")
    if "tax" in t or "80c" in t:
        gaps.append("Tax planning may need structuring beyond ad hoc ELSS")
    if not gaps:
        gaps = ["Goal timelines could be sharper", "Asset allocation not fully specified"]

    needs = []
    if "loan" in t or "emi" in t:
        needs.append("Stress-test EMI vs income and rate scenarios")
    if "trading" in t or "fno" in t:
        needs.append("Define max loss per trade and capital at risk")
    if not needs:
        needs.append("Set up tracking on ET Markets watchlist")
        needs.append("Choose default SIP date aligned with salary credit")

    priorities = list(persona.financial_goals)[:3]
    if len(priorities) < 3:
        priorities.append("Build repeatable monthly investable surplus")

    surfaces = ["ET Markets app — watchlist & news", "ET Wealth calculators"]
    if persona.risk_appetite.value == "High":
        surfaces.append("ET Markets — F&O chain & screeners")
    else:
        surfaces.append("ET Prime — long-form explainers")

    fam = "new_to_et"
    if "prime" in t or "subscriber" in t:
        fam = "power_user"
    elif "et " in t or "economic times" in t:
        fam = "casual_reader"

    return FinancialLifeNavigatorResult(
        portfolio_gaps=gaps[:6],
        immediate_needs=needs[:5],
        life_priorities=priorities[:5],
        suggested_et_surfaces=surfaces,
        et_familiarity=fam,
        navigator_reasoning="Heuristic navigator: gaps/needs from keywords + persona goals (offline).",
    )


def run_financial_navigator(
    conversation_text: str,
    persona: PersonaProfile,
    client: Any | None = None,
) -> FinancialLifeNavigatorResult:
    if not _gemini_ready() and client is None:
        return _heuristic_navigator(conversation_text, persona)
    user = P.user_navigator_payload(conversation_text, persona.model_dump_json())
    try:
        data = _chat_json(P.NAVIGATOR_SYSTEM, user, client=client)
        if data.get("et_familiarity") in ("", "null"):
            data["et_familiarity"] = None
        return FinancialLifeNavigatorResult.model_validate(data)
    except Exception:
        return _heuristic_navigator(conversation_text, persona)


# --- Ecosystem mapper & onboarding path ---


def _default_onboarding_path(persona: PersonaProfile, ids: list[str]) -> OnboardingPath:
    goal_txt = ", ".join(persona.financial_goals) or "your goals"
    return OnboardingPath(
        headline=f"Let’s map ET to what you care about: {goal_txt}.",
        total_estimated_seconds=180,
        phases=[
            OnboardingPhase(
                phase_id="welcome_goals",
                title="Who you are & what you want (~60s)",
                estimated_seconds=60,
                objectives=["Confirm risk comfort", "Prioritize 1–2 outcomes"],
                host_prompts=[
                    "In one line, what would make this year a win financially?",
                    "When markets dip, do you tend to worry or stay calm?",
                ],
                ecosystem_ids=ids[:2] if len(ids) > 1 else ["et_markets_app", "welcome_concierge_bot"],
            ),
            OnboardingPhase(
                phase_id="et_surfaces",
                title="Show the ET toolkit (~60s)",
                estimated_seconds=60,
                objectives=["Match Markets vs Prime vs Learning"],
                host_prompts=[
                    "ET Markets helps with live prices and portfolios; Prime goes deep on why stories move.",
                    "If you want structured learning, we’ll point you to the right masterclass track.",
                ],
                ecosystem_ids=ids[2:5] if len(ids) > 4 else ["et_prime", "mc_personal_finance_101"],
            ),
            OnboardingPhase(
                phase_id="next_steps",
                title="Your plan & partner options (~60s)",
                estimated_seconds=60,
                objectives=["Concrete next click", "Optional partner check"],
                host_prompts=[
                    "We’ll save this profile so ET surfaces feel personal, not random.",
                    "If you need a loan, card, or cover, we’ll only show partners that fit your story.",
                ],
                ecosystem_ids=ids[5:8] if len(ids) > 7 else ["partner_wealth_robo", "evt_wealth_summit"],
            ),
        ],
    )


def _heuristic_ecosystem(
    persona: PersonaProfile,
    _nav: FinancialLifeNavigatorResult,
    offerings: list[dict],
) -> EcosystemOnboardingMap:
    ranked = filter_by_persona(offerings, persona.persona_type.value, limit=12)
    tps: list[EcosystemTouchpoint] = []
    for i, o in enumerate(ranked[:8], start=1):
        tps.append(
            EcosystemTouchpoint(
                touchpoint_id=str(o.get("id", f"tp_{i}")),
                pillar=str(o.get("pillar", "content")),
                name=str(o.get("name", "ET offering")),
                priority_rank=i,
                why_for_this_user=f"Matches {persona.persona_type.value} and your stated focus.",
                urgency="this_week" if i > 2 else "now",
                cta=f"Open {o.get('name')} from your ET home.",
            )
        )
    ids = [str(o.get("id")) for o in ranked[:8]]
    opath = _default_onboarding_path(persona, ids)
    return EcosystemOnboardingMap(
        prioritized_touchpoints=tps,
        onboarding_path=opath,
        mapper_reasoning="Heuristic ecosystem map: persona-ranked catalog + 3×60s onboarding skeleton.",
    )


def run_ecosystem_onboarding_map(
    persona: PersonaProfile,
    navigator: FinancialLifeNavigatorResult,
    catalog_excerpt: str,
    client: Any | None = None,
) -> EcosystemOnboardingMap:
    offerings = load_ecosystem_catalog()
    if not _gemini_ready() and client is None:
        return _heuristic_ecosystem(persona, navigator, offerings)
    user = P.user_ecosystem_mapper_payload(
        persona.model_dump_json(),
        navigator.model_dump_json(),
        catalog_excerpt,
    )
    try:
        data = _chat_json(P.ECOSYSTEM_MAPPER_SYSTEM, user, client=client)
        op = data.get("onboarding_path") or {}
        phases_raw = op.get("phases") or []
        phases = [OnboardingPhase.model_validate(p) for p in phases_raw]
        path = OnboardingPath(
            headline=op.get("headline") or "Your personalized ET path",
            total_estimated_seconds=int(op.get("total_estimated_seconds") or 180),
            phases=phases,
        )
        touches = [EcosystemTouchpoint.model_validate(x) for x in data.get("prioritized_touchpoints") or []]
        if not touches or not path.phases:
            return _heuristic_ecosystem(persona, navigator, offerings)
        return EcosystemOnboardingMap(
            prioritized_touchpoints=touches,
            onboarding_path=path,
            mapper_reasoning=data.get("mapper_reasoning") or "",
        )
    except Exception:
        return _heuristic_ecosystem(persona, navigator, offerings)


# --- Welcome script ---


def _heuristic_welcome(persona: PersonaProfile, eco_map: EcosystemOnboardingMap) -> WelcomeConciergeScript:
    path = eco_map.onboarding_path
    beats: list[WelcomePhaseBeat] = []
    for ph in path.phases:
        prompts = " ".join(ph.host_prompts[:3])
        beats.append(
            WelcomePhaseBeat(
                phase_id=ph.phase_id,
                host_script=f"{ph.title}. {prompts}",
                listening_cues=["risk comfort", "timeline", "biggest money worry"],
            )
        )
    name_hint = persona.persona_type.value
    return WelcomeConciergeScript(
        opening_line=(
            f"Welcome to ET — I’m your concierge. In about three minutes we’ll tune "
            f"the whole ecosystem to you as someone leaning {name_hint}."
        ),
        closing_line=(
            "You’re set — open your prioritized ET touchpoints and we’ll keep nudges helpful, not noisy."
        ),
        phase_beats=beats,
        script_reasoning="Heuristic host: stitched from onboarding_path host_prompts (~180s target).",
    )


def run_welcome_script(
    persona: PersonaProfile,
    ecosystem_map: EcosystemOnboardingMap,
    client: Any | None = None,
) -> WelcomeConciergeScript:
    if not _gemini_ready() and client is None:
        return _heuristic_welcome(persona, ecosystem_map)
    payload = ecosystem_map.onboarding_path.model_dump_json()
    user = P.user_welcome_script_payload(persona.model_dump_json(), payload)
    try:
        data = _chat_json(P.WELCOME_SCRIPT_SYSTEM, user, client=client)
        beats_raw = data.get("phase_beats") or []
        beats = [WelcomePhaseBeat.model_validate(b) for b in beats_raw]
        if not beats:
            return _heuristic_welcome(persona, ecosystem_map)
        return WelcomeConciergeScript(
            opening_line=data.get("opening_line") or "",
            closing_line=data.get("closing_line") or "",
            phase_beats=beats,
            script_reasoning=data.get("script_reasoning") or "",
        )
    except Exception:
        return _heuristic_welcome(persona, ecosystem_map)


# --- Cross-sell ---


def sample_behavior_events() -> list[BehaviorEvent]:
    """Demo stream of touchpoint signals for hackathon judging."""
    return [
        BehaviorEvent(
            event_id="e1",
            surface="markets",
            event_type="watchlist_add",
            subject_id="smallcap_index",
            metadata={"tickers": 3},
        ),
        BehaviorEvent(
            event_id="e2",
            surface="prime",
            event_type="article_read",
            subject_id="rate_cycle_brief",
            metadata={"completion_pct": 0.72},
        ),
        BehaviorEvent(
            event_id="e3",
            surface="et_app",
            event_type="trial_window",
            subject_id="prime_trial_day2",
            metadata={"days_left": 5},
        ),
    ]


def _heuristic_cross_sell(
    persona: PersonaProfile,
    events: list[BehaviorEvent],
    offerings: list[dict],
) -> CrossSellBundle:
    opps: list[CrossSellOpportunity] = []
    ev_surfaces = {e.surface for e in events}
    if "prime" in ev_surfaces or any("prime" in e.subject_id for e in events):
        opps.append(
            CrossSellOpportunity(
                opportunity_id="prime_trial_nudge",
                title="Finish Prime trial with a saved reading list",
                channel="in_app",
                trigger_summary="You started Prime content but haven’t locked a reading ritual.",
                pitch="We’ll line up 3 Prime reads matched to your risk profile — finish trial with clarity.",
                priority=1,
                related_catalog_ids=["et_prime"],
            )
        )
    if persona.persona_type.value == "Loan Seeker":
        opps.append(
            CrossSellOpportunity(
                opportunity_id="home_loan_comparator",
                title="Rate check while you compare EMIs",
                channel="email",
                trigger_summary="Loan intent detected in profile.",
                pitch="One-tap partner home loan board with scenarios for floating vs fixed.",
                priority=2,
                related_catalog_ids=["partner_home_loan"],
            )
        )
    if persona.risk_appetite.value == "High":
        opps.append(
            CrossSellOpportunity(
                opportunity_id="mc_trading_followup",
                title="Trading masterclass seat hold",
                channel="push",
                trigger_summary="High risk persona + markets engagement.",
                pitch="Reserve cohort for ET Masterclass: position sizing and execution discipline.",
                priority=3,
                related_catalog_ids=["mc_trading_intensive"],
            )
        )
    if not opps:
        opps.append(
            CrossSellOpportunity(
                opportunity_id="markets_onboarding",
                title="ET Markets quick tour",
                channel="in_app",
                trigger_summary="Light behavioral signal; soften with education-first cross-sell.",
                pitch="90-second tour: watchlist + MF screener so ET feels usable day one.",
                priority=2,
                related_catalog_ids=["et_markets_app"],
            )
        )
    return CrossSellBundle(
        opportunities=sorted(opps, key=lambda x: x.priority)[:7],
        engine_reasoning="Heuristic cross-sell: surface/trigger rules + persona (offline).",
    )


def _resolve_behavior_events(
    behavior_events: list[BehaviorEvent] | None,
) -> list[BehaviorEvent]:
    """
    Use real client touchpoint signals when provided; otherwise demo samples so
    the cross-sell engine always has material to rank in offline / hackathon mode.
    """
    if behavior_events is not None and len(behavior_events) > 0:
        return behavior_events
    return sample_behavior_events()


def run_cross_sell(
    persona: PersonaProfile,
    navigator: FinancialLifeNavigatorResult,
    behavior_events: list[BehaviorEvent] | None,
    catalog_excerpt: str,
    client: Any | None = None,
) -> CrossSellBundle:
    events = _resolve_behavior_events(behavior_events)
    offerings = load_ecosystem_catalog()
    if not _gemini_ready() and client is None:
        return _heuristic_cross_sell(persona, events, offerings)
    events_payload = json.dumps([e.model_dump(mode="json") for e in events], ensure_ascii=False)
    user = P.user_cross_sell_payload(
        persona.model_dump_json(),
        navigator.model_dump_json(),
        events_payload,
        catalog_excerpt,
    )
    try:
        data = _chat_json(P.CROSS_SELL_SYSTEM, user, client=client)
        raw_ops = data.get("opportunities") or []
        ops = [CrossSellOpportunity.model_validate(o) for o in raw_ops]
        if not ops:
            return _heuristic_cross_sell(persona, events, offerings)
        return CrossSellBundle(
            opportunities=sorted(ops, key=lambda x: x.priority)[:7],
            engine_reasoning=data.get("engine_reasoning") or "",
        )
    except Exception:
        return _heuristic_cross_sell(persona, events, offerings)


# --- Marketplace ---


def _category_from_row(row: dict) -> str:
    return str(row.get("partner_category") or "wealth")


def _heuristic_marketplace(
    persona: PersonaProfile,
    navigator: FinancialLifeNavigatorResult,
) -> MarketplaceBundle:
    partners = partner_offers_only(load_ecosystem_catalog())
    ranked = filter_by_persona(partners, persona.persona_type.value, limit=8)
    picks: list[MarketplaceOfferSuggestion] = []
    for row in ranked[:4]:
        cat = _category_from_row(row)
        if cat not in ("credit_card", "loan", "insurance", "wealth"):
            cat = "wealth"
        picks.append(
            MarketplaceOfferSuggestion(
                catalog_id=str(row.get("id", "partner_unknown")),
                category=cat,  # type: ignore[arg-type]
                product_name=str(row.get("name", "Partner offer")),
                fit_summary=f"Aligned with {persona.persona_type.value} and current ET navigator signals.",
                next_step="Tap to check illustrative eligibility; partner disclosures apply.",
            )
        )
    return MarketplaceBundle(
        offers=picks,
        marketplace_reasoning="Heuristic marketplace: partner catalog ranked by persona fit.",
    )


def run_marketplace(
    persona: PersonaProfile,
    navigator: FinancialLifeNavigatorResult,
    partner_excerpt: str,
    client: Any | None = None,
) -> MarketplaceBundle:
    if not _gemini_ready() and client is None:
        return _heuristic_marketplace(persona, navigator)
    user = P.user_marketplace_payload(
        persona.model_dump_json(),
        navigator.model_dump_json(),
        partner_excerpt,
    )
    try:
        data = _chat_json(P.MARKETPLACE_SYSTEM, user, client=client)
        offers_raw = data.get("offers") or []
        offers: list[MarketplaceOfferSuggestion] = []
        for o in offers_raw:
            try:
                offers.append(MarketplaceOfferSuggestion.model_validate(o))
            except ValidationError:
                continue
            if len(offers) >= 4:
                break
        if not offers:
            return _heuristic_marketplace(persona, navigator)
        default_disc = MarketplaceBundle().compliance_disclaimer
        return MarketplaceBundle(
            offers=offers,
            compliance_disclaimer=(data.get("compliance_disclaimer") or default_disc),
            marketplace_reasoning=data.get("marketplace_reasoning") or "",
        )
    except Exception:
        return _heuristic_marketplace(persona, navigator)
