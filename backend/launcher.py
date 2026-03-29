"""
Single entry to run the ET AI Concierge full concierge stack.

- ``python -m backend.app`` / ``python -m backend`` → full concierge (entire stack).
"""

from __future__ import annotations

import argparse
import contextlib
import errno
import http.server
import json
import os
import re
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


def _parse_behavior_events_payload(raw: Any) -> list[Any] | None:
    """Validate client touchpoint events for the cross-sell engine. None = omit (use server demo mix)."""
    from .schemas import BehaviorEvent

    if raw is None:
        return None
    if not isinstance(raw, list):
        return None
    out: list[BehaviorEvent] = []
    for item in raw[:40]:
        if not isinstance(item, dict):
            continue
        try:
            out.append(BehaviorEvent.model_validate(item))
        except Exception:
            continue
    return out if out else None


def _message_mentions(text: str, *patterns: str) -> bool:
    lowered = text.lower()
    return any(pattern in lowered for pattern in patterns)


def _trim_sentence(text: str) -> str:
    value = str(text or "").strip()
    return value[:-1] if value.endswith(".") else value


def _extract_focus_subject(message: str) -> str | None:
    text = str(message or "").strip()
    if not text:
        return None
    if '"' in text:
        parts = text.split('"')
        if len(parts) >= 3 and parts[1].strip():
            return parts[1].strip()
    if ":" in text:
        subject = text.split(":", 1)[1].strip()
        if subject:
            return _trim_sentence(subject)
    return None


def _mentions_any(text: str, terms: list[str]) -> bool:
    return any(term in text for term in terms)


def _is_profile_meta_question(message: str) -> bool:
    """
    True when the user is asking about *their* ET concierge profile / persona / snapshot,
    not generic article-backed finance trivia (which should use RAG on topic keywords).
    """
    lower = str(message or "").strip().lower()
    if not lower:
        return False
    if _message_mentions(
        lower,
        "rate my profile",
        "score my profile",
        "grade my profile",
        "evaluate my profile",
        "review my profile",
        "how is my profile",
        "summarize my profile",
        "describe my profile",
        "analyze my profile",
        "profile summary",
        "what is my persona",
        "what's my persona",
        "my financial persona",
        "what does my profile say",
        "what does the profile say",
        "strengths and weaknesses",
        "weaknesses of my profile",
    ):
        return True
    if "persona" in lower and _message_mentions(lower, "my ", "what is my", "what's my", "describe my"):
        return True
    if "profile" in lower and _message_mentions(
        lower,
        "rate my",
        "score my",
        "grade my",
        "evaluate my",
        "review my",
        "summarize my",
        "describe my",
        "analyze my",
    ):
        return True
    if _message_mentions(lower, "my risk profile", "my risk score", "rate my risk", "score my risk"):
        return True
    return False


def _is_sip_averse(text: str) -> bool:
    lowered = text.lower()
    negative_phrases = [
        "don't want sip",
        "do not want sip",
        "dont want sip",
        "no sip",
        "not sip",
        "without sip",
        "other than sip",
        "anything except sip",
        "avoid sip",
    ]
    return _mentions_any(lowered, negative_phrases)


def _plan_reply(headline: str, steps: list[str], closing: str | None = None) -> str:
    lines = [headline.strip()]
    for index, step in enumerate(steps, start=1):
        lines.append(f"{index}. {step.strip()}")
    if closing:
        lines.append(closing.strip())
    return "\n".join(lines)


def _looks_like_simple_question(text: str) -> bool:
    lowered = str(text or "").strip().lower()
    if not lowered:
        return False
    if lowered.endswith("?"):
        return True
    return any(
        lowered.startswith(prefix)
        for prefix in (
            "what is",
            "what are",
            "why is",
            "why are",
            "how much",
            "how do",
            "can i",
            "should i",
            "is it",
            "does",
        )
    )


def _extract_topic_after_colon(message: str) -> str | None:
    text = str(message or "").strip()
    if ":" not in text:
        return None
    topic = text.split(":", 1)[1].strip()
    for marker in (". Tell me", ". What", ". Explain", ". Help", ". Walk me", ". Should", ". Whether"):
        if marker in topic:
            topic = topic.split(marker, 1)[0].strip()
            break
    return _trim_sentence(topic) if topic else None


def _extract_alert_context(message: str) -> tuple[str | None, str | None]:
    text = str(message or "").strip()
    if not text:
        return None, None
    lower = text.lower()
    marker = "i got this et alert:"
    start = lower.find(marker)
    if start == -1:
        return None, None
    payload = text[start + len(marker):].strip()
    payload = re.split(
        r"\b(tell me what triggered it and whether it matters for me right now|explain this alert|act on it now)\b",
        payload,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0].strip()
    payload = _trim_sentence(payload)
    if not payload:
        return None, None
    bits = [part.strip() for part in re.split(r"\.\s+", payload) if part.strip()]
    if not bits:
        return None, None
    title = bits[0]
    body = ". ".join(bits[1:]).strip() or None
    return title, body


def _find_partner_offer_details(message: str, artifact: dict[str, Any]) -> dict[str, Any] | None:
    target = (_extract_focus_subject(message) or _extract_topic_after_colon(message) or "").strip().lower()
    if not target:
        return None
    try:
        from .ecosystem import load_ecosystem_catalog
    except Exception:
        return None

    catalog = load_ecosystem_catalog()
    for row in catalog:
        if str(row.get("pillar") or "") != "partner_services":
            continue
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        lowered = name.lower()
        if target == lowered or target in lowered or lowered in target:
            return row

    for item in (artifact.get("marketplace", {}) or {}).get("offers") or []:
        if not isinstance(item, dict):
            continue
        name = str(item.get("product_name") or item.get("name") or item.get("title") or "").strip()
        lowered = name.lower()
        if name and (target == lowered or target in lowered or lowered in target):
            return item
    return None


def _partner_offer_fallback_reply(message: str, artifact: dict[str, Any]) -> str | None:
    offer = _find_partner_offer_details(message, artifact)
    if not offer:
        return None

    persona = artifact.get("core", {}).get("persona", {}) or {}
    goals = [str(goal).strip() for goal in (persona.get("financial_goals") or []) if str(goal).strip()]
    persona_type = str(persona.get("persona_type") or "your current profile").strip()
    risk = str(persona.get("risk_appetite") or "Medium").strip()
    name = str(
        offer.get("name")
        or offer.get("product_name")
        or offer.get("title")
        or "This partner offer"
    ).strip()
    summary = str(
        offer.get("summary")
        or offer.get("fit_summary")
        or "This is a partner financial-services offer surfaced through ET."
    ).strip()
    category = str(offer.get("partner_category") or offer.get("category") or "").strip().lower()
    tags = [str(tag).strip().lower() for tag in (offer.get("tags") or []) if str(tag).strip()]

    if category == "credit_card":
        what_it_is = "It is an everyday cashback credit card, so the value is convenience and rewards on normal spending rather than investing growth."
        fit_now = (
            f"It can fit a {persona_type} profile if you already pay your bill in full every month and want to reduce routine spend friction."
        )
        caution = "It does not directly advance long-term investing goals, and it matters right now only if better cash-flow control or rewards on planned spending are useful to you."
    elif category == "loan":
        what_it_is = "It is a borrowing offer, so the real question is whether it solves a necessary financing need at an acceptable cost."
        fit_now = f"It can fit a {persona_type} profile when the loan supports a defined goal and the EMI still leaves room for your core financial plan."
        caution = "It matters right now only if you actively need credit; otherwise it is better treated as optional inventory, not a prompt to borrow."
    elif category == "insurance":
        what_it_is = "It is a protection product, so the value is reducing downside risk rather than improving returns."
        fit_now = f"It usually fits better when your profile needs more protection or family-risk cover than when you are just looking for higher returns."
        caution = "It matters right now if you have a clear protection gap; otherwise you can review it later."
    else:
        what_it_is = "It is a guided wealth-service offer, so the question is whether you need managed advice versus keeping things self-directed."
        fit_now = f"It fits best when your goals need more structure or ongoing decision support than a do-it-yourself setup gives you."
        caution = "It matters right now only if you want outside help implementing goals, not just more products to compare."

    goal_line = f" Your active goals look like {', '.join(goals)}." if goals else ""
    tag_hint = ""
    if "starter" in tags or "cashback" in tags:
        tag_hint = " The catalog positions it as a simpler starter-style offer."

    return (
        f"**{name}**: {summary} {what_it_is}{tag_hint}\n\n"
        f"For your profile, risk reads as **{risk}** and persona reads as **{persona_type}**.{goal_line} "
        f"{fit_now} {caution}"
    )


def _should_append_product_footer(message: str) -> bool:
    lower = str(message or "").lower()
    return _message_mentions(
        lower,
        "suggest",
        "recommend",
        "option",
        "options",
        "product",
        "products",
        "what else",
        "which should i use",
        "which one should i open",
        "use next",
        "where should i start",
        "et option",
    )


def _filter_titles_for_message(message: str, titles: list[str]) -> list[str]:
    lower = str(message or "").lower()
    if _message_mentions(lower, "watchlist", "et markets"):
        focused = [title for title in titles if any(term in title.lower() for term in ("watchlist", "tracking", "portfolio"))]
        return focused
    if _message_mentions(lower, "partner offer", "credit card", "cashback", "home loan", "personal loan", "term life", "health top-up", "robo advisory", "wealth management"):
        focused = [
            title
            for title in titles
            if any(term in title.lower() for term in ("card", "cashback", "credit", "loan", "insurance", "wealth"))
        ]
        return focused
    if _message_mentions(lower, "alert", "notification"):
        focused = [title for title in titles if any(term in title.lower() for term in ("alert", "trigger", "risk", "market"))]
        return focused
    return titles


CHAT_ANALYZER_SYSTEM = """You are the ET AI Concierge chat intent analyzer.
Read the user's latest message, the conversation transcript, and an initial ET retrieval pass, then produce retrieval guidance.

Output only valid JSON:
{
  "user_intent": "short phrase",
  "intent_category": "profile_meta|et_knowledge|general",
  "use_rag_for_answer": true,
  "route": "welcome_concierge|navigator|cross_sell|marketplace|general",
  "refined_query": "clean search query for finance + ET knowledge retrieval",
  "retrieval_queries": ["query 1", "query 2", "query 3"],
  "answer_style": "direct|plan|explain|compare|next_steps",
  "must_avoid": ["items the user explicitly rejected, like SIP"],
  "constraints": ["important constraints like low risk, no recurring plan"],
  "needs_clarification": false,
  "clarifying_question": ""
}

Rules:
- **intent_category `profile_meta`**: user asks about *their own* ET concierge profile, persona, rating, review, strengths/weaknesses, or summarizing *their* snapshot. Set **use_rag_for_answer** to **false**. Set **retrieval_queries** to [] and **refined_query** to a short echo of their ask (not random product keywords). **answer_style** usually **direct** or **explain**.
- **intent_category `et_knowledge`**: user wants ET articles, definitions, market explainers, or topic education — **use_rag_for_answer** **true**, fill **retrieval_queries**.
- **intent_category `general`**: mixed or unclear — default **use_rag_for_answer** **true** unless the question is clearly profile-only.
- Capture explicit dislikes or refusals in must_avoid.
- If the user asks for an amount, include that in refined_query when using RAG.
- Keep retrieval_queries short and practical when used.
- Prefer precision over verbosity.
- Use "direct" for simple factual or straightforward questions that should be answered in normal prose.
- Use "plan" only when the user is asking what to do, how to proceed, or for a step-by-step path.
- Route to `welcome_concierge` for onboarding, discovery, ET journey, and "what should I use first" prompts.
- Route to `navigator` for goals, portfolio gaps, risk, investing, planning, and financial life questions (including **profile_meta** when it is about *their* plan).
- Route to `cross_sell` for alerts, upsell, timing, nudges, and "what else should ET show me" prompts.
- Route to `marketplace` for loans, insurance, cards, wealth products, and partner-service requests.
"""


CHAT_SYNTHESIS_SYSTEM = """You are the ET AI Concierge response writer.
You will receive:
- the user's latest message
- chat analysis JSON
- ET concierge context JSON
- retrieved ET knowledge excerpts

Write a dynamic, helpful answer that sounds like a capable financial LLM — concrete, specific, and directly responsive.

Rules:
- Answer the user's actual question directly. Do not substitute meta-advice like "read this in the context of your profile" or "it should be understood in terms of what it does" without defining what it does in plain language.
- Define any product or gap named by the user (e.g. ELSS, emergency liquidity, portfolio gap) in 1–2 clear sentences before giving guidance.
- If the user asks what something *means* or how to *address* a gap, give definitions, trade-offs, and 2–4 actionable steps — not vague framing.
- If the user rejected something, do not recommend it unless you explicitly explain why it is still necessary.
- Use the retrieved ET knowledge when relevant, but synthesize rather than copy.
- Strictly follow `analysis.answer_style` for structure only; content must still be substantive.
- If `answer_style` is `direct`, answer in 1-2 short paragraphs, not a numbered plan.
- If `answer_style` is `explain`, answer in plain prose with a brief explanation.
- If `answer_style` is `compare`, compare the options clearly in prose or short bullets.
- If `answer_style` is `plan` or `next_steps`, use a numbered plan.
- Mention ET products, markets tools, masterclasses, events, or partner services only when they genuinely fit the question.
- Keep the tone natural and practical, like a smart concierge.
- Behave like one unified ET concierge across four jobs:
  1. Welcome Concierge: understand the user and guide onboarding
  2. Financial Life Navigator: identify goals, gaps, and immediate needs
  3. Ecosystem Cross-Sell Engine: suggest the next best ET touchpoint when appropriate
  4. Services Marketplace Agent: guide the user to relevant partner services only when asked or clearly useful
- Use `analysis.route` to decide which part of the ET ecosystem should lead the answer.
- If a follow-up question would genuinely improve personalization, end with exactly one short follow-up question.
- Do not force products into every reply. Sometimes the best concierge answer is explanation first, recommendation second.

Output only valid JSON:
{
  "reply": "final user-facing answer"
}
"""


CHAT_DIRECT_ANSWER_SYSTEM = """You are **ET AI Concierge** — answer like a strong financial LLM: clear, direct, and helpful.

You receive the user's message, optional conversation transcript, summarized concierge profile context, and excerpts from ET's knowledge base.

**Hard rules**
- Answer the question asked. Do not reply with only meta-commentary (e.g. "consider your profile", "read in context") without real explanation and next steps.
- If they ask what a **portfolio gap** or phrase like "emergency liquidity plan unclear" means: explain it plainly (e.g. emergency fund = cash you can access in days; "unclear" = you have not sized or parked it yet), then give 3–5 concrete steps.
- If they ask about a **named product** (e.g. ELSS tax saver shortlist): say what ELSS is (equity, 80C, 3-year lock-in, market risk), why it might fit tax-saving + long horizon, and when to act vs wait — in plain language.
- Use ET excerpts to support your answer; synthesize, do not copy verbatim.
- 2–5 short paragraphs unless they explicitly want a comparison or numbered plan.

Output only valid JSON: {"reply": "..."}
"""


PROFILE_META_CHAT_SYSTEM = """You are **ET AI Concierge**. The user is asking about **their own** profile, persona, or wants a **rating / review** of their current ET concierge snapshot.

**Hard rules**
- Answer **only** from `concierge_context` (persona, goals, gaps, needs, recommendations) and the conversation transcript. Do **not** invent account balances, returns, or regulated promises.
- Do **not** anchor the answer on unrelated ET article titles (e.g. SIP explainers) unless the user explicitly asked about that topic.
- Give a **direct** answer: a short overall take (you may give an informal score out of 10 if it helps), **2–3 strengths**, **1–3 gaps or risks**, and **one concrete next step** aligned with their goals and risk.
- If some fields in context are sparse, say what is missing and what to clarify — still stay specific to what you do have.

Output only valid JSON: {"reply": "..."}
"""


def _compact_chat_context(artifact: dict[str, Any], *, avoid_terms: list[str] | None = None) -> dict[str, Any]:
    avoid = {str(term).strip().lower() for term in (avoid_terms or []) if str(term).strip()}
    persona = artifact.get("core", {}).get("persona", {}) or {}
    recs = artifact.get("core", {}).get("recommendations", {}) or {}
    navigator = artifact.get("financial_life", {}) or {}
    marketplace = artifact.get("marketplace", {}) or {}
    ecosystem = artifact.get("ecosystem", {}) or {}
    welcome_script = artifact.get("welcome_script", {}) or {}
    cross_sell = artifact.get("cross_sell", {}) or {}

    def _allowed_name(name: str) -> bool:
        lowered = str(name or "").lower()
        return not any(term in lowered for term in avoid)

    products = []
    for product in recs.get("recommended_products") or []:
        if not isinstance(product, dict):
            continue
        name = str(product.get("name") or "")
        if not name or not _allowed_name(name):
            continue
        products.append(
            {
                "name": name,
                "category": product.get("category"),
                "why_it_fits": product.get("why_it_fits"),
            }
        )

    return {
        "persona": {
            "persona_type": persona.get("persona_type"),
            "risk_appetite": persona.get("risk_appetite"),
            "risk_score": persona.get("risk_score"),
            "financial_goals": persona.get("financial_goals"),
        },
        "welcome_concierge": {
            "headline": ecosystem.get("headline"),
            "opening_line": welcome_script.get("opening_line"),
            "closing_line": welcome_script.get("closing_line"),
            "onboarding_phases": [
                {
                    "title": phase.get("title"),
                    "estimated_seconds": phase.get("estimated_seconds"),
                    "objectives": phase.get("objectives"),
                    "host_prompts": phase.get("host_prompts"),
                }
                for phase in (
                    ((ecosystem.get("onboarding_path") or {}).get("phases"))
                    or ecosystem.get("phases")
                    or []
                )
                if isinstance(phase, dict)
            ][:3],
        },
        "recommended_products": products[:4],
        "recommended_actions": [
            {
                "title": item.get("title"),
                "description": item.get("description"),
                "timeframe": item.get("timeframe"),
                "priority": item.get("priority"),
            }
            for item in (recs.get("recommended_actions") or [])
            if isinstance(item, dict)
        ][:3],
        "portfolio_gaps": list(navigator.get("portfolio_gaps") or [])[:4],
        "immediate_needs": list(navigator.get("immediate_needs") or [])[:4],
        "life_priorities": list(navigator.get("life_priorities") or [])[:4],
        "suggested_et_surfaces": list(navigator.get("suggested_et_surfaces") or [])[:4],
        "touchpoints": [
            {
                "name": item.get("name"),
                "why_for_this_user": item.get("why_for_this_user"),
                "cta": item.get("cta"),
            }
            for item in (ecosystem.get("prioritized_touchpoints") or [])
            if isinstance(item, dict)
        ][:4],
        "cross_sell_opportunities": [
            {
                "title": item.get("title"),
                "channel": item.get("channel"),
                "trigger_summary": item.get("trigger_summary"),
                "pitch": item.get("pitch"),
            }
            for item in (cross_sell.get("opportunities") or [])
            if isinstance(item, dict)
        ][:4],
        "marketplace_offers": [
            {
                "name": item.get("name") or item.get("title"),
                "summary": item.get("summary") or item.get("why_it_fits"),
            }
            for item in (marketplace.get("offers") or marketplace.get("recommended_offers") or [])
            if isinstance(item, dict)
        ][:4],
    }


def _merge_article_hits(*article_lists: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for article_list in article_lists:
        for article in article_list:
            article_id = str(article.get("id") or article.get("title") or "")
            if article_id in seen:
                continue
            seen.add(article_id)
            merged.append(article)
    return merged


def _llm_chat_reply(
    *,
    transcript: str,
    message: str,
    artifact: dict[str, Any],
) -> str:
    from .llm_provider import chat_json
    from .rag import format_excerpts_for_llm, search_articles

    # Intent: own profile / persona — do not pull unrelated article chunks (e.g. SIP explainers).
    if _is_profile_meta_question(message):
        return _profile_meta_llm_reply(transcript, message, artifact)

    initial_hits = search_articles(message, top_k=4)
    initial_excerpt = format_excerpts_for_llm(initial_hits, max_chars_per=500)

    analysis_payload = chat_json(
        CHAT_ANALYZER_SYSTEM,
        json.dumps(
            {
                "transcript": transcript[-8000:],
                "latest_user_message": message,
                "initial_retrieved_et_excerpts": initial_excerpt,
            },
            ensure_ascii=False,
        ),
    )

    ic = str(analysis_payload.get("intent_category") or "").strip().lower()
    use_rag_raw = analysis_payload.get("use_rag_for_answer")
    use_rag = True if use_rag_raw is None else bool(use_rag_raw)
    if ic == "profile_meta" or not use_rag:
        return _profile_meta_llm_reply(transcript, message, artifact)

    retrieval_queries = [
        str(query).strip()
        for query in (analysis_payload.get("retrieval_queries") or [])
        if str(query).strip()
    ]
    refined_query = str(analysis_payload.get("refined_query") or message).strip() or message
    must_avoid = [
        str(item).strip()
        for item in (analysis_payload.get("must_avoid") or [])
        if str(item).strip()
    ]
    route = str(analysis_payload.get("route") or "").strip().lower()
    if route not in {"welcome_concierge", "navigator", "cross_sell", "marketplace", "general"}:
        route = "marketplace" if _message_mentions(message.lower(), "loan", "insurance", "credit card", "card", "wealth manager", "advisor") else "general"
    answer_style = str(analysis_payload.get("answer_style") or "").strip().lower()
    if answer_style not in {"direct", "plan", "explain", "compare", "next_steps"}:
        answer_style = "direct" if _looks_like_simple_question(message) else "plan"
    constraints = [
        str(item).strip()
        for item in (analysis_payload.get("constraints") or [])
        if str(item).strip()
    ]

    article_hits = _merge_article_hits(
        initial_hits,
        search_articles(refined_query, top_k=4),
        *[search_articles(query, top_k=2) for query in retrieval_queries[:3]],
    )[:5]
    excerpts = format_excerpts_for_llm(article_hits, max_chars_per=900)
    context = _compact_chat_context(artifact, avoid_terms=must_avoid)

    synthesis_payload = chat_json(
        CHAT_SYNTHESIS_SYSTEM,
        json.dumps(
            {
                "latest_user_message": message,
                "analysis": {
                    "user_intent": analysis_payload.get("user_intent"),
                    "intent_category": ic,
                    "route": route,
                    "refined_query": refined_query,
                    "answer_style": answer_style,
                    "must_avoid": must_avoid,
                    "constraints": constraints,
                    "needs_clarification": bool(analysis_payload.get("needs_clarification")),
                    "clarifying_question": analysis_payload.get("clarifying_question"),
                },
                "concierge_context": context,
                "retrieved_et_excerpts": excerpts,
            },
            ensure_ascii=False,
        ),
    )

    reply = str(synthesis_payload.get("reply") or "").strip()
    if not reply:
        raise RuntimeError("Empty reply from chat synthesis")

    if article_hits:
        titles = [str(article.get("title") or "").strip() for article in article_hits[:2] if str(article.get("title") or "").strip()]
        if titles and "Relevant ET reads:" not in reply:
            reply += f"\n\nRelevant ET reads: {', '.join(titles)}."
    return reply


def _direct_llm_answer(
    message: str,
    transcript: str,
    artifact: dict[str, Any],
    excerpts: str,
) -> str | None:
    """Single-shot answer when two-step chat fails or heuristic path would sound robotic. Returns None if no LLM."""
    from .llm_provider import chat_json, llm_available

    if not llm_available():
        return None
    try:
        context = _compact_chat_context(artifact)
        payload = json.dumps(
            {
                "latest_user_message": message,
                "conversation_transcript": transcript[-6000:],
                "concierge_context": context,
                "et_article_excerpts": excerpts,
            },
            ensure_ascii=False,
        )
        data = chat_json(CHAT_DIRECT_ANSWER_SYSTEM, payload)
        reply = str(data.get("reply") or "").strip()
        return reply or None
    except Exception:
        return None


def _profile_meta_llm_reply(
    transcript: str,
    message: str,
    artifact: dict[str, Any],
) -> str:
    """Answer profile/persona questions from concierge context only — no article retrieval."""
    from .llm_provider import chat_json

    context = _compact_chat_context(artifact)
    payload = json.dumps(
        {
            "latest_user_message": message,
            "conversation_transcript": transcript[-8000:],
            "concierge_context": context,
        },
        ensure_ascii=False,
    )
    data = chat_json(PROFILE_META_CHAT_SYSTEM, payload)
    reply = str(data.get("reply") or "").strip()
    if not reply:
        raise RuntimeError("Empty profile-meta reply")
    return reply


def _compose_profile_rating_reply(artifact: dict[str, Any]) -> str:
    """Offline / heuristic profile review from pipeline artifact (no random article titles)."""
    persona = artifact.get("core", {}).get("persona", {}) or {}
    navigator = artifact.get("financial_life", {}) or {}
    recs = artifact.get("core", {}).get("recommendations", {}) or {}
    goals = ", ".join(persona.get("financial_goals") or []) or "Not fully specified in the snapshot"
    risk = str(persona.get("risk_appetite") or "moderate").strip()
    ptype = str(persona.get("persona_type") or "investor").strip()
    rs = persona.get("risk_score")
    gaps = [str(g) for g in (navigator.get("portfolio_gaps") or []) if g][:3]
    needs = [str(n) for n in (navigator.get("immediate_needs") or []) if n][:3]
    products = recs.get("recommended_products") or []
    first_product = next((p.get("name") for p in products if isinstance(p, dict) and p.get("name")), None)

    score_hint = ""
    if isinstance(rs, (int, float)):
        rs_clamped = max(1, min(10, float(rs)))
        score_hint = f"Based on the stored risk score ({rs_clamped:.0f}/10-style scale), "
    else:
        score_hint = "From your stated risk stance, "

    lines = [
        "**Profile snapshot**",
        f"- Persona type: **{ptype}**",
        f"- Goals: {goals}",
        f"- Risk: **{risk}**" + (f" (score {rs})" if rs is not None else ""),
        "",
        "**Quick read**",
        score_hint
        + "your plan reads as "
        + ("balanced if goals and risk line up; " if "moderate" in risk.lower() else "tilted toward your stated comfort; ")
        + "use gaps below as the honest to-do list.",
    ]
    if gaps:
        lines.extend(["", "**Gaps to watch**", *[f"- {g}" for g in gaps]])
    if needs:
        lines.extend(["", "**Immediate needs**", *[f"- {n}" for n in needs]])
    lines.extend(
        [
            "",
            "**Next step**",
            first_product
            and f"Open your top ET match (**{first_product}**) only if it fits the goal above; otherwise tighten emergency liquidity or the highest-priority gap first."
            or "Pick one gap or need above and set a single measurable target for the next 30 days (amount or account action).",
        ]
    )
    return "\n".join(lines)


def _rag_grounded_fallback_reply(message: str, artifact: dict[str, Any]) -> str:
    from .rag import search_articles

    lower = message.lower().strip()
    if _is_profile_meta_question(message):
        return _compose_profile_rating_reply(artifact)
    partner_reply = _partner_offer_fallback_reply(message, artifact)
    if partner_reply:
        return partner_reply
    sip_averse = _is_sip_averse(lower)
    simple_question = _looks_like_simple_question(message)
    topic = _extract_topic_after_colon(message) or _extract_focus_subject(message)
    articles = search_articles(message, top_k=3)
    titles = [str(article.get("title") or "").strip() for article in articles if str(article.get("title") or "").strip()]
    titles = _filter_titles_for_message(message, titles)
    if sip_averse:
        titles = [title for title in titles if "sip" not in title.lower()]
    if _message_mentions(lower, "watchlist", "et markets"):
        reply = (
            "Start by creating one focused ET Markets watchlist around the goal you care about most right now. "
            "Add only a few names or instruments first, then turn on the alerts and news tracking that help you review them consistently."
        )
        if titles:
            reply += f"\n\nRelevant ET reads: {', '.join(titles[:2])}."
        return reply
    if _message_mentions(lower, "i'm reviewing", "i am reviewing", "et recommendation") and topic:
        reply = (
            f"**{topic}** usually refers to a curated ET shortlist of ELSS (equity-linked saving scheme) funds used for Section 80C tax saving. "
            "ELSS is equity-oriented, has a three-year lock-in, and carries market risk — so it fits tax-saving goals with a horizon of roughly five years or more, not money you need in 1–2 years.\n\n"
            "Check whether tax saving is your main goal this year and whether you can stay invested through volatility. "
            "If yes, picking one or two funds from the shortlist after comparing expense ratio and track record is reasonable; if your goal is shorter or you need stability, a debt-oriented 80C option may be more appropriate."
        )
        if titles:
            reply += f"\n\nRelevant ET reads: {', '.join(titles[:2])}."
        return reply
    if _message_mentions(lower, "i got this et alert", "this et alert", "alert guidance"):
        alert_title, alert_body = _extract_alert_context(message)
        subject = alert_title or topic or "this alert"
        trigger = (
            f"The trigger looks like: {alert_body}. "
            if alert_body
            else "The trigger is not fully described in the prompt, so treat this as a high-level alert title until you open the underlying ET card details. "
        )
        reply = (
            f"**{subject[0].upper() + subject[1:] if len(subject) > 1 else subject.upper()}** is the alert headline. "
            f"{trigger}It matters right now only if it changes one of your active goals, risks, or ET actions; otherwise it is a monitor, not an emergency."
        )
        if titles:
            reply += f"\n\nRelevant ET reads: {', '.join(titles[:2])}."
        return reply
    if _message_mentions(lower, "onboarding step", "walk me through this onboarding step"):
        subject = topic or "this onboarding step"
        reply = (
            f"{subject[0].upper() + subject[1:] if len(subject) > 1 else subject.upper()} is meant to move you to the next useful ET surface without overwhelming you. "
            "Start with the first ET tool or section mentioned there, then use that result to decide the next step."
        )
        if titles:
            reply += f"\n\nRelevant ET reads: {', '.join(titles[:2])}."
        return reply
    if _message_mentions(lower, "portfolio gap", "immediate financial need", "help with this et step", "et recommendation", "et surface fit me"):
        subject = topic or "this gap"
        if _message_mentions(lower, "emergency", "liquidity"):
            reply = (
                "**Emergency liquidity** means cash (or near-cash) you can access within a few days for unexpected expenses or income loss — typically **3–6 months of essential expenses**, sometimes more if your income is variable.\n\n"
                "**“Unclear”** in your profile means you have not yet sized that buffer or parked it in safe, liquid options (savings account, liquid fund, etc.).\n\n"
                "**What to do:** (1) Add up monthly must-pay bills and multiply by 3–6. (2) Start a small automatic transfer weekly or monthly until you hit that target. "
                "(3) Keep this money separate from long-term investments. (4) Only after this base is comfortable, increase market-linked investing."
            )
        else:
            reply = (
                f"**{subject}** is a signal from your financial-life snapshot that something may be missing or underweighted — for example protection, liquidity, tax planning, or goal clarity.\n\n"
                "Address it by: (1) naming the risk if you ignore it, (2) picking one number or deadline (e.g. months of expenses saved, or term cover amount), "
                "(3) taking one concrete ET action this week (calculator, shortlist, or article), then revisiting."
            )
        if titles:
            reply += f"\n\nRelevant ET reads: {', '.join(titles[:2])}."
        return reply

    if simple_question and not sip_averse:
        if _message_mentions(lower, "minimum amount", "how much", "starting amount"):
            reply = (
                "There usually is no universal minimum amount to invest. The better starting point is the smallest amount "
                "you can put in without affecting essential expenses or your emergency buffer."
            )
        elif _message_mentions(lower, "what is", "define", "meaning of"):
            topic = _extract_focus_subject(message)
            if not topic:
                parts = str(message).strip().rstrip("?").split()
                topic = " ".join(parts[2:]).strip() if len(parts) > 2 else "this concept"
            topic = topic or "this concept"
            tl = topic.lower()
            if "elss" in tl:
                reply = (
                    "**ELSS (Equity Linked Saving Scheme)** is a type of mutual fund eligible for Section **80C** tax deduction in India. "
                    "It invests mainly in equities, has a **3-year lock-in** per installment, and carries **market risk** — returns are not fixed. "
                    "It suits tax-saving plus long-term wealth building when you can stay invested several years; it is usually a poor fit for money you need within 3 years."
                )
            elif "emergency" in tl or "liquidity" in tl:
                reply = (
                    "**Emergency liquidity** is money you can access quickly without selling long-term investments at a bad time — typically held in savings, liquid mutual funds, or similar. "
                    "A common target is **3–6 months of expenses**. Building it reduces the need to break FDs or redeem equity in a panic."
                )
            else:
                reply = (
                    f"**{topic[0].upper() + topic[1:] if len(topic) > 1 else topic.upper()}** — in personal finance, clarify whether it is a **product** (e.g. fund, insurance), a **goal** (e.g. retirement), or a **risk** (e.g. concentration). "
                    "Then check horizon (when you need the money), risk comfort, and tax treatment; that trio decides whether it belongs in your plan."
                )
        else:
            reply = (
                "The short answer depends on your goal, timeline, and risk comfort more than on any one rule. "
                "A direct answer should start from that context rather than forcing a fixed plan."
            )
        if titles:
            reply += f"\n\nRelevant ET reads: {', '.join(titles[:2])}."
        return reply

    if sip_averse:
        lines = [
            "Here is a non-SIP plan based on your question.",
            "1. Start with a one-time amount that feels safe after bills and emergency cash.",
            "2. Choose one simple product first instead of committing to a recurring structure.",
            "3. Review the result, then decide whether you want to stay lump-sum or move to a repeatable plan later.",
        ]
        if titles:
            lines.append("")
            lines.append(f"Relevant ET reads: {', '.join(titles[:2])}.")
        return "\n".join(lines)

    if _message_mentions(lower, "minimum amount", "how much", "starting amount", "beginner"):
        lines = [
            "Here is a practical starting plan.",
            "1. Decide the smallest amount you can invest without touching essential monthly expenses.",
            "2. Use that amount to test the process first, not to maximize returns immediately.",
            "3. Increase only after you know the product, the risk, and your own comfort level.",
        ]
        if titles:
            lines.append("")
            lines.append(f"Relevant ET reads: {', '.join(titles[:2])}.")
        return "\n".join(lines)

    if titles:
        lines = [
            "Here is the best next-step plan from the ET knowledge base.",
            f"1. Start with {titles[0]}.",
            "2. Match that idea against your goal timeline and risk comfort.",
            "3. Only then decide whether the ET product recommendation actually fits this question.",
        ]
        if len(titles) > 1:
            lines.append("")
            lines.append(f"Relevant ET reads: {', '.join(titles[:2])}.")
        return "\n".join(lines)

    return _compose_heuristic_chat_reply(message, artifact)


def _compose_heuristic_chat_reply(message: str, artifact: dict[str, Any]) -> str:
    lower = message.lower().strip()
    persona = artifact.get("core", {}).get("persona", {}) or {}
    recs = artifact.get("core", {}).get("recommendations", {}) or {}
    actions = recs.get("recommended_actions") or []
    products = recs.get("recommended_products") or []
    risk = str(persona.get("risk_appetite") or "moderate").lower()
    goals = ", ".join(persona.get("financial_goals") or [])

    focus_subject = _extract_focus_subject(message)
    sip_averse = _is_sip_averse(lower)
    asks_amount = _message_mentions(
        lower,
        "minimum amount",
        "minimum to invest",
        "smallest amount",
        "least amount",
        "how little can i invest",
        "how much can i start with",
        "starting amount",
        "how much should i invest",
        "how much can i invest",
    )

    if _message_mentions(lower, "explain this alert", "act on it now", "alert and tell me whether"):
        subject = focus_subject or "this alert"
        return _plan_reply(
            f"Here is the plan for reviewing {subject}.",
            [
                "Check whether it connects to one of your active goals, gaps, or recent ET actions.",
                "Validate the timing before acting, especially if it asks you to commit money quickly.",
                "Use it as a review prompt first, not as an automatic buy signal.",
            ],
        )
    if _message_mentions(lower, "explain why", "why is", "why should", "good next step for me"):
        subject = focus_subject or "this recommendation"
        first_fit = next(
            (
                product.get("why_it_fits") or product.get("summary")
                for product in products
                if isinstance(product, dict) and (product.get("why_it_fits") or product.get("summary"))
            ),
            None,
        )
        if first_fit:
            return _plan_reply(
                f"Here is why {subject} fits your plan.",
                [
                    f"It is being surfaced because {_trim_sentence(first_fit).lower()}.",
                    "Confirm the exact problem it solves for you before you spend time on setup.",
                    "If the fit still looks strong, make it your next focused action inside ET.",
                ],
            )
        return _plan_reply(
            f"Here is why {subject} is showing up.",
            [
                "It likely matches your current goal, risk stance, and preferred ET experience.",
                "Check that fit first instead of treating every recommendation as equally urgent.",
                "Once confirmed, use it as the next step in your ET journey.",
            ],
        )
    if _message_mentions(lower, "execute this recommended step", "walk me through this", "help me execute", "help me act on this", "how do i fix this", "whether i should use it next"):
        subject = focus_subject or "this step"
        return _plan_reply(
            f"Here is a simple plan to act on {subject.lower()}.",
            [
                "Start with the smallest setup or review action available.",
                "Check whether the outcome actually improves your current goal, risk fit, or portfolio gap.",
                "Only then decide whether it deserves deeper follow-through.",
            ],
            "That keeps the step manageable while still moving your plan forward.",
        )
    if _message_mentions(lower, "more et product suggestions", "more suggestions", "what else", "other options"):
        other_names = [
            product.get("name")
            for product in products[:3]
            if isinstance(product, dict) and product.get("name")
        ]
        if other_names:
            return _plan_reply(
                "Here is the next layer of ET options to explore.",
                [
                    f"Review these options first: {', '.join(other_names)}.",
                    "Prioritize the one that matches how hands-on you want to be.",
                    "Choose the option that gives you value fastest for your current goal.",
                ],
            )
        return _plan_reply(
            "Here is the best way to expand your ET options.",
            [
                "Balance depth, actionability, and how often you want ET to engage you.",
                "Pick one path first: learning, markets, alerts, or partner services.",
                "Then narrow the shortlist instead of exploring everything at once.",
            ],
        )
    if sip_averse and _message_mentions(lower, "invest", "start", "beginner", "money", "plan", "option", "way"):
        return _plan_reply(
            "Here is a non-SIP investment path.",
            [
                "Start with a single product you understand instead of forcing a recurring plan immediately.",
                "Use a small trial amount first so you can learn the workflow and the risk.",
                "Only move to a repeatable structure later if it actually suits your style.",
            ],
        )
    if sip_averse and asks_amount:
        return _plan_reply(
            "Here is a non-SIP way to start investing.",
            [
                "Begin with a small one-time amount that will not affect your bills or emergency buffer.",
                "Use that first amount to learn how the product behaves before committing more money.",
                "Add more only when you are comfortable with the risk and the process.",
            ],
        )
    if asks_amount:
        return _plan_reply(
            "Here is a beginner-friendly investing plan.",
            [
                "Pick an amount you can invest every month without affecting rent, bills, or your emergency cushion.",
                "Start small and automate it so consistency becomes the habit.",
                "Increase the amount only after a few smooth months, not after one excited week.",
            ],
        )
    if _message_mentions(lower, "sip", "systematic investment plan") and not sip_averse:
        return _plan_reply(
            "Here is a practical SIP plan.",
            [
                "Set a monthly amount you can sustain in both calm and volatile markets.",
                "Focus on consistency first instead of trying to optimize the perfect number.",
                "Step the amount up gradually as income and confidence improve.",
            ],
        )
    if _message_mentions(lower, "retirement", "retire", "pension"):
        return _plan_reply(
            "Here is a clean retirement-planning approach.",
            [
                "Start by estimating how far away retirement is.",
                "Use growth-oriented instruments only if the time horizon is long enough.",
                "Build a regular investing habit and review the mix as retirement gets closer.",
            ],
        )
    if _message_mentions(lower, "emergency fund", "rainy day", "contingency"):
        return _plan_reply(
            "Here is the emergency-fund plan.",
            [
                "Build this before most long-term investing.",
                "Keep it liquid and stable instead of chasing higher returns.",
                "Use it to protect the rest of your plan from unexpected shocks.",
            ],
        )
    if _message_mentions(lower, "tax", "elss", "80c"):
        return _plan_reply(
            "Here is the tax-saving decision plan.",
            [
                "Compare the lock-in period with when you will actually need the money.",
                "Check whether the volatility matches your risk comfort.",
                "Choose the tax-saving route only if it also fits the goal timeline.",
            ],
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
        base = _plan_reply(
            "Here is the strongest next-step plan.",
            [
                f"{first_action[0].upper() + first_action[1:] if len(first_action) > 1 else first_action.upper()}",
                "Check that it fits your current goal and timing before going deeper.",
                "Use the result to decide the next ET surface or product to open.",
            ],
        )
    elif first_product:
        base = _plan_reply(
            "Here is the practical next move.",
            [
                f"Explore {first_product[0].lower() + first_product[1:] if len(first_product) > 1 else first_product.lower()}.",
                "Confirm why it fits before you commit time or money.",
                "If the fit is clear, make it your next action in ET.",
            ],
        )
    else:
        base = _plan_reply(
            "Here is the best way to answer that.",
            [
                "Look at your goal timeline first.",
                "Check what your cash flow can support consistently.",
                "Then match the choice to your risk tolerance instead of using a single factor.",
            ],
        )

    if context:
        base += f"\nThis direction fits well with {context}."
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
    behavior_events: list[Any] | None = None,
) -> dict[str, Any]:
    """
    Execute the full ET AI Concierge pipeline and return a JSON-serializable dict.
    """
    from .orchestrator import concierge_to_frontend_json, run_concierge_pipeline

    ct = conversation_text or DEFAULT_CONVERSATION
    rq = user_query_for_rag or DEFAULT_RAG_Q

    with _force_heuristic_mode(not use_live_llm):
        state = run_concierge_pipeline(ct, rq, skip_rag=skip_rag, behavior_events=behavior_events)
    return concierge_to_frontend_json(state)


def run_chat_model(
    *,
    conversation_transcript: str,
    user_message: str,
    use_live_llm: bool = False,
    behavior_events: list[Any] | None = None,
) -> dict[str, Any]:
    from .agentic import run_agentic_concierge
    from .llm_provider import llm_available
    from .orchestrator import concierge_to_frontend_json, run_concierge_pipeline
    from .rag import search_articles

    transcript = (conversation_transcript or user_message or DEFAULT_CONVERSATION).strip()
    message = (user_message or DEFAULT_RAG_Q).strip()

    from .llm_provider import llm_available
    from .rag import format_excerpts_for_llm

    live_chat_enabled = use_live_llm or llm_available()

    def _artifact_and_excerpts() -> tuple[dict[str, Any], str]:
        st = run_concierge_pipeline(transcript, message, skip_rag=False, behavior_events=behavior_events)
        art = concierge_to_frontend_json(st)
        hits = search_articles(message, top_k=5)
        ex = format_excerpts_for_llm(hits, max_chars_per=900)
        return art, ex

    if live_chat_enabled:
        try:
            state = run_concierge_pipeline(
                transcript,
                message,
                skip_rag=False,
                behavior_events=behavior_events,
            )
            artifact = concierge_to_frontend_json(state)
            reply = _llm_chat_reply(
                transcript=transcript,
                message=message,
                artifact=artifact,
            )
            return {
                "message": reply,
                "mode": "llm_profile" if _is_profile_meta_question(message) else "llm_rag",
                "artifact": artifact,
            }
        except Exception:
            if use_live_llm:
                try:
                    result = run_agentic_concierge(
                        user_goal=message,
                        conversation_transcript=transcript,
                    )
                    artifact = result.last_artifact
                    if result.mode != "error" and artifact:
                        return {
                            "message": result.final_message,
                            "mode": result.mode,
                            "artifact": artifact,
                        }
                except Exception:
                    pass
            # Recover with a single direct LLM pass (avoids robotic heuristics when keys are set)
            try:
                with _force_heuristic_mode(True):
                    artifact, excerpts = _artifact_and_excerpts()
                if _is_profile_meta_question(message):
                    direct = _profile_meta_llm_reply(transcript, message, artifact)
                    mode_recover = "llm_profile_recover"
                else:
                    direct = _direct_llm_answer(message, transcript, artifact, excerpts)
                    mode_recover = "llm_direct_recover"
                if direct:
                    return {
                        "message": direct,
                        "mode": mode_recover,
                        "artifact": artifact,
                    }
            except Exception:
                pass

    with _force_heuristic_mode(True):
        state = run_concierge_pipeline(
            transcript,
            message,
            skip_rag=False,
            behavior_events=behavior_events,
        )
    artifact = concierge_to_frontend_json(state)
    hits = search_articles(message, top_k=5)
    excerpts = format_excerpts_for_llm(hits, max_chars_per=900)
    articles = hits[:2]
    rag_answer = artifact.get("core", {}).get("rag", {}) or {}
    recommendations = artifact.get("core", {}).get("recommendations", {}) or {}
    products = recommendations.get("recommended_products") or []
    sip_averse = _is_sip_averse(message)
    names = [
        p.get("name", "")
        for p in products
        if p.get("name") and not (sip_averse and "sip" in str(p.get("name", "")).lower())
    ][:2]
    titles = [a.get("title", "") for a in articles if a.get("title")]

    # Prefer one-shot LLM answer whenever keys exist (sounds like a real assistant, not templates)
    if llm_available():
        if _is_profile_meta_question(message):
            try:
                direct = _profile_meta_llm_reply(transcript, message, artifact)
            except Exception:
                direct = None
        else:
            direct = _direct_llm_answer(message, transcript, artifact, excerpts)
        if direct:
            if not _is_profile_meta_question(message):
                if titles and "Relevant ET reads:" not in direct:
                    direct += f"\n\nRelevant ET reads: {', '.join(titles)}."
                if names and "Good ET starting points:" not in direct and _should_append_product_footer(message):
                    direct += f"\n\nGood ET starting points: {', '.join(names)}."
            return {
                "message": direct,
                "mode": "llm_profile" if _is_profile_meta_question(message) else "llm_direct",
                "artifact": artifact,
            }

    if _is_profile_meta_question(message):
        reply = _compose_profile_rating_reply(artifact)
    else:
        rag_reply = str(rag_answer.get("answer") or "").strip()
        if rag_reply and not rag_reply.lower().startswith("offline mode:"):
            reply = rag_reply
        else:
            reply = _rag_grounded_fallback_reply(message, artifact)

    if not _is_profile_meta_question(message) and titles and "Relevant ET reads:" not in reply:
        reply += f"\n\nRelevant ET reads: {', '.join(titles)}."
    if not _is_profile_meta_question(message) and names and "Good ET starting points:" not in reply and _should_append_product_footer(message):
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


def _client_disconnected(exc: BaseException) -> bool:
    """True if the peer closed the connection (ignore; do not log as server error)."""
    if isinstance(exc, (BrokenPipeError, ConnectionAbortedError, ConnectionResetError)):
        return True
    if isinstance(exc, OSError):
        if exc.errno in (errno.EPIPE, errno.ECONNRESET, errno.ECONNABORTED):
            return True
        if getattr(exc, "winerror", None) in (10053, 10054):
            return True
    return False


def _json_response(handler: http.server.BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
    try:
        handler.send_response(status)
        handler.send_header("Content-Type", "application/json; charset=utf-8")
        handler.send_header("Content-Length", str(len(body)))
        handler.send_header("Access-Control-Allow-Origin", "*")
        handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        handler.send_header("Access-Control-Allow-Headers", "Content-Type")
        handler.end_headers()
        handler.wfile.write(body)
    except OSError as exc:
        if _client_disconnected(exc):
            return
        raise


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
            if self.path not in ("/api/plan", "/api/message", "/api/onboarding"):
                _json_response(self, 404, {"error": "Not found"})
                return

            try:
                payload = self._read_json()
            except json.JSONDecodeError:
                _json_response(self, 400, {"error": "Invalid JSON payload"})
                return

            if self.path == "/api/onboarding":
                from .onboarding_enrich import run_onboarding_apply, run_onboarding_generate

                profile = payload.get("profile") if isinstance(payload.get("profile"), dict) else {}
                phases = payload.get("phases") or []
                action = str(payload.get("action") or "generate").strip().lower()
                if not isinstance(phases, list) or not phases:
                    _json_response(self, 400, {"error": "phases (non-empty array) is required"})
                    return
                try:
                    if action == "apply":
                        selections = payload.get("selections") or []
                        if not isinstance(selections, list):
                            _json_response(self, 400, {"error": "selections must be an array"})
                            return
                        result, elapsed_ms = self._timed(
                            lambda: run_onboarding_apply(profile, phases, selections)
                        )
                    else:
                        result, elapsed_ms = self._timed(
                            lambda: run_onboarding_generate(profile, phases)
                        )
                except Exception as exc:  # pragma: no cover
                    _json_response(
                        self,
                        500,
                        {"error": "Onboarding handler failed", "detail": str(exc)},
                    )
                    return
                _json_response(
                    self,
                    200,
                    {
                        "meta": {
                            "elapsed_ms": elapsed_ms,
                            "action": action,
                            "provider": _status_payload()["provider"],
                        },
                        "result": result,
                    },
                )
                return

            if self.path == "/api/message":
                transcript = str(payload.get("transcript") or DEFAULT_CONVERSATION).strip()
                user_message = str(payload.get("message") or DEFAULT_RAG_Q).strip()
                use_live_llm = bool(payload.get("use_live_llm", False))
                behavior_events = _parse_behavior_events_payload(payload.get("behavior_events"))
                if not user_message:
                    _json_response(self, 400, {"error": "message is required"})
                    return
                try:
                    result, elapsed_ms = self._timed(
                        lambda: run_chat_model(
                            conversation_transcript=transcript,
                            user_message=user_message,
                            use_live_llm=use_live_llm,
                            behavior_events=behavior_events,
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
            behavior_events = _parse_behavior_events_payload(payload.get("behavior_events"))
            try:
                result, elapsed_ms = self._timed(
                    lambda: run_model(
                        conversation_text=conversation,
                        user_query_for_rag=rag_query,
                        print_provider_hint=False,
                        skip_rag=skip_rag,
                        use_live_llm=use_live_llm,
                        behavior_events=behavior_events,
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
