"""Pipeline orchestration + action dispatcher (real-or-mock SMS/email/save-plan)."""

from __future__ import annotations

import base64
import json
import os
import smtplib
import uuid
from email.message import EmailMessage
from typing import Any, Optional
from urllib import parse as urllib_parse
from urllib import request as urllib_request

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


def _env_flag(name: str, default: bool = False) -> bool:
    raw = str(os.getenv(name, "")).strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _sms_recipient() -> str:
    return os.getenv("ET_ALERT_SMS_TO") or os.getenv("ET_MOCK_SMS_TO") or "+919999000000"


def _email_recipient() -> str:
    return os.getenv("ET_ALERT_EMAIL_TO") or os.getenv("ET_MOCK_EMAIL_TO") or "user@example.com"


def _send_sms_via_twilio(to: str, body: str) -> dict[str, Any]:
    account_sid = str(os.getenv("ET_TWILIO_ACCOUNT_SID", "")).strip()
    auth_token = str(os.getenv("ET_TWILIO_AUTH_TOKEN", "")).strip()
    from_number = str(os.getenv("ET_TWILIO_FROM", "")).strip()
    api_base = str(os.getenv("ET_TWILIO_API_BASE", "https://api.twilio.com")).strip().rstrip("/")
    if not (account_sid and auth_token and from_number):
        raise RuntimeError("Missing Twilio credentials or ET_TWILIO_FROM.")

    url = f"{api_base}/2010-04-01/Accounts/{account_sid}/Messages.json"
    payload = urllib_parse.urlencode({"To": to, "From": from_number, "Body": body}).encode("utf-8")
    req = urllib_request.Request(url, data=payload, method="POST")
    auth = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    req.add_header("Authorization", f"Basic {auth}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib_request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8") or "{}")

    return {
        "sid": data.get("sid"),
        "status": data.get("status"),
        "provider": "twilio",
    }


def _send_email_via_smtp(to: str, subject: str, html_preview: str, plain_text: str) -> dict[str, Any]:
    host = str(os.getenv("ET_SMTP_HOST", "")).strip()
    port = int(str(os.getenv("ET_SMTP_PORT", "587")).strip() or "587")
    username = str(os.getenv("ET_SMTP_USERNAME", "")).strip()
    password = str(os.getenv("ET_SMTP_PASSWORD", "")).strip()
    from_addr = str(os.getenv("ET_SMTP_FROM", username or "")).strip()
    if not (host and from_addr):
        raise RuntimeError("Missing ET_SMTP_HOST or ET_SMTP_FROM.")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.set_content(plain_text)
    msg.add_alternative(html_preview, subtype="html")

    use_ssl = _env_flag("ET_SMTP_USE_SSL", default=False)
    use_starttls = _env_flag("ET_SMTP_USE_STARTTLS", default=not use_ssl)
    smtp_cls = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
    with smtp_cls(host, port, timeout=20) as server:
        if not use_ssl and use_starttls:
            server.starttls()
        if username:
            server.login(username, password)
        server.send_message(msg)

    return {
        "provider": "smtp",
        "from": from_addr,
        "to": to,
    }


def _dispatch_sms_action(to: str, body: str) -> DispatchedAction:
    payload = {
        "function": "send_sms",
        "to": to,
        "body": body[:320],
    }
    try:
        payload.update(_send_sms_via_twilio(to, body[:320]))
        return DispatchedAction(
            channel=SimulatedChannel.SMS,
            payload=payload,
            status="sent",
            provider_mock="twilio",
        )
    except Exception as exc:
        payload["provider"] = "twilio_mock"
        return DispatchedAction(
            channel=SimulatedChannel.SMS,
            payload=payload,
            status="simulated_pending",
            provider_mock="twilio_mock",
            error_detail=str(exc),
        )


def _dispatch_email_action(to: str, subject: str, html_preview: str, plain_text: str) -> DispatchedAction:
    payload = {
        "function": "send_email",
        "to": to,
        "subject": subject,
        "html_preview": html_preview,
    }
    try:
        payload.update(_send_email_via_smtp(to, subject, html_preview, plain_text))
        return DispatchedAction(
            channel=SimulatedChannel.EMAIL,
            payload=payload,
            status="sent",
            provider_mock="smtp",
        )
    except Exception as exc:
        payload["provider"] = "smtp_mock"
        return DispatchedAction(
            channel=SimulatedChannel.EMAIL,
            payload=payload,
            status="simulated_pending",
            provider_mock="smtp_mock",
            error_detail=str(exc),
        )


def dispatch_actions(
    persona: PersonaProfile,
    recs: RecommendationBundle,
    *,
    enable_sms: bool = True,
    enable_email: bool = True,
    enable_save: bool = True,
) -> ActionDispatchResult:
    """Convert recommendations into save-plan plus SMS/email delivery actions."""
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
            f"ET Concierge: Hi - based on your {persona.risk_appetite.value} risk profile, "
            f"review: {top_products}. Reply STOP to opt out."
        )
        sms_action = _dispatch_sms_action(_sms_recipient(), msg)
        actions.append(sms_action)
        reasoning_parts.append(
            "Sent SMS digest of top products."
            if sms_action.status == "sent"
            else "Queued SMS digest of top products (mock Twilio fallback)."
        )

    if enable_email:
        subject = "Your ET AI Concierge plan"
        html_preview = f"<p>Goals: {', '.join(persona.financial_goals)}</p><p>{top_products}</p>"
        plain_text = (
            "Your ET AI Concierge plan\n\n"
            f"Goals: {', '.join(persona.financial_goals)}\n"
            f"Top products: {top_products}"
        )
        email_action = _dispatch_email_action(_email_recipient(), subject, html_preview, plain_text)
        actions.append(email_action)
        reasoning_parts.append(
            "Sent email with goals + product shortlist."
            if email_action.status == "sent"
            else "Queued email with goals + product shortlist (mock SMTP fallback)."
        )

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
    End-to-end flow: Profiler -> Recommender -> RAG -> Dispatcher -> Explainability.

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
