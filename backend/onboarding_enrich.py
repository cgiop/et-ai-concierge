"""
Onboarding path: send phases to the LLM (Gemini by default) to produce tap buttons,
then merge user selections back into the ET Concierge profile.
"""

from __future__ import annotations

import json
from typing import Any

from .llm_provider import chat_json, llm_available

PROFILE_KEYS = frozenset({"interests", "goal", "investments", "risk", "engagement"})

ONBOARDING_GENERATE_SYSTEM = """You are ET Concierge. Given the user's current profile snapshot and ET onboarding path phases, produce short tap targets.

Return JSON only with this exact shape:
{
  "tiles": [
    {
      "phase_id": "<same as input phase>",
      "buttons": [
        { "label": "<max 10 words, actionable>", "hint": "<optional 6-12 words why it matters>" }
      ]
    }
  ]
}

Rules:
- Exactly one tiles[] entry per input phase, same phase_id order as input.
- Each phase gets exactly 3 or 4 buttons.
- Buttons must be commitments, priorities, or concrete next steps the user can affirm (not generic marketing).
- Use Indian English where natural; keep labels concise for mobile UI.
- Do not repeat the phase title verbatim in every label; diversify wording.
"""

ONBOARDING_APPLY_SYSTEM = """You are ET Concierge. Merge the user's onboarding button selections into their profile.

Return JSON only:
{
  "profile_updates": {
    "interests": "<optional string — refine or extend>",
    "goal": "<optional>",
    "investments": "<optional>",
    "risk": "<optional — may include emoji prefix like other UI>",
    "engagement": "<optional>"
  },
  "summary": "<one short sentence for the UI>"
}

Rules:
- Only include keys in profile_updates that should change. Omit keys that are already strong and unchanged.
- When merging, prefer appending clarifying detail (after a semicolon or new clause) rather than wiping prior content.
- Reflect the user's explicit selections; strengthen specificity (time horizon, product focus, learning vs trading, etc.).
- Keep each value under ~220 characters unless the existing field was already long.
- Never invent large numbers, account balances, or regulated promises.
"""


def _normalize_phase(raw: dict[str, Any], index: int) -> dict[str, Any]:
    pid = str(raw.get("phase_id") or raw.get("id") or f"phase_{index + 1}").strip()
    title = str(raw.get("title") or pid).strip()
    objs = raw.get("objectives") or []
    prompts = raw.get("host_prompts") or []
    if not isinstance(objs, list):
        objs = [objs] if objs else []
    if not isinstance(prompts, list):
        prompts = [prompts] if prompts else []
    return {
        "phase_id": pid,
        "title": title,
        "objectives": [str(x).strip() for x in objs if str(x).strip()],
        "host_prompts": [str(x).strip() for x in prompts if str(x).strip()],
        "estimated_seconds": int(raw.get("estimated_seconds") or 60),
    }


def _heuristic_generate(phases: list[dict[str, Any]]) -> dict[str, Any]:
    tiles: list[dict[str, Any]] = []
    for p in phases:
        pid = p["phase_id"]
        pool: list[str] = []
        pool.extend(p.get("objectives") or [])
        pool.extend(p.get("host_prompts") or [])
        seen: set[str] = set()
        uniq: list[str] = []
        for line in pool:
            s = line.strip()
            if len(s) > 90:
                s = s[:87] + "…"
            if s and s.lower() not in seen:
                seen.add(s.lower())
                uniq.append(s)
        while len(uniq) < 3:
            uniq.append(f"Prioritize: {p['title'][:40]}")
        uniq = uniq[:4]
        tiles.append(
            {
                "phase_id": pid,
                "buttons": [{"label": u, "hint": ""} for u in uniq],
            }
        )
    return {"tiles": tiles, "mode": "heuristic"}


def _sanitize_updates(raw: dict[str, Any] | None) -> dict[str, str]:
    out: dict[str, str] = {}
    if not isinstance(raw, dict):
        return out
    for k, v in raw.items():
        if k in PROFILE_KEYS and v is not None:
            s = str(v).strip()
            if s:
                out[k] = s[:2000]
    return out


def _merge_et_onboarding(
    profile: dict[str, Any],
    phases: list[dict[str, Any]],
    selections: list[dict[str, Any]],
) -> list[dict[str, str]]:
    by_id = {p["phase_id"]: p for p in phases}
    existing: dict[str, dict[str, str]] = {}
    for x in profile.get("et_onboarding") or []:
        if isinstance(x, dict) and x.get("id"):
            existing[str(x["id"])] = {"id": str(x["id"]), "title": str(x.get("title") or x["id"])}
    for sel in selections:
        pid = str(sel.get("phase_id") or "").strip()
        chosen = sel.get("chosen") or []
        if not pid or not chosen:
            continue
        title = by_id.get(pid, {}).get("title") or pid
        existing[pid] = {"id": pid, "title": title}
    return list(existing.values())


def run_onboarding_generate(profile: dict[str, Any], phases_raw: list[Any]) -> dict[str, Any]:
    phases = [_normalize_phase(p, i) for i, p in enumerate(phases_raw) if isinstance(p, dict)]
    if not phases:
        return {"tiles": [], "mode": "empty", "error": "no phases"}

    if not llm_available():
        return _heuristic_generate(phases)

    user = json.dumps(
        {"profile": profile, "phases": phases},
        ensure_ascii=False,
        default=str,
    )
    try:
        data = chat_json(ONBOARDING_GENERATE_SYSTEM, user, client=None, model_name=None)
        tiles_in = data.get("tiles") or []
        # Align with normalized phases; drop unknown phase_ids
        by_pid = {t.get("phase_id"): t for t in tiles_in if isinstance(t, dict)}
        out_tiles: list[dict[str, Any]] = []
        for p in phases:
            pid = p["phase_id"]
            block = by_pid.get(pid) or {}
            buttons = block.get("buttons") or []
            cleaned: list[dict[str, str]] = []
            for b in buttons[:6]:
                if not isinstance(b, dict):
                    continue
                lab = str(b.get("label") or "").strip()
                if not lab:
                    continue
                cleaned.append(
                    {
                        "label": lab[:200],
                        "hint": str(b.get("hint") or "").strip()[:240],
                    }
                )
            if len(cleaned) < 3:
                return {**_heuristic_generate(phases), "mode": "heuristic_fallback"}
            out_tiles.append({"phase_id": pid, "buttons": cleaned[:4]})
        return {"tiles": out_tiles, "mode": "llm"}
    except Exception:
        return {**_heuristic_generate(phases), "mode": "heuristic_fallback"}


def run_onboarding_apply(
    profile: dict[str, Any],
    phases_raw: list[Any],
    selections: list[dict[str, Any]],
) -> dict[str, Any]:
    phases = [_normalize_phase(p, i) for i, p in enumerate(phases_raw) if isinstance(p, dict)]
    if not phases:
        return {"error": "no phases", "merged_profile": dict(profile)}

    # Filter selections with at least one choice
    sel_norm: list[dict[str, Any]] = []
    for s in selections:
        if not isinstance(s, dict):
            continue
        pid = str(s.get("phase_id") or "").strip()
        chosen = s.get("chosen") or []
        if not pid:
            continue
        if isinstance(chosen, str):
            chosen = [chosen]
        chosen_list = [str(c).strip() for c in chosen if str(c).strip()]
        if chosen_list:
            sel_norm.append({"phase_id": pid, "chosen": chosen_list})

    if not sel_norm:
        return {"error": "no selections", "merged_profile": dict(profile)}

    if not llm_available():
        lines: list[str] = []
        by_id = {p["phase_id"]: p for p in phases}
        for s in sel_norm:
            title = by_id.get(s["phase_id"], {}).get("title") or s["phase_id"]
            for c in s["chosen"]:
                lines.append(f"{title}: {c}")
        glue = " · ".join(lines)
        merged = dict(profile)
        prev_g = str(merged.get("goal") or "").strip()
        merged["goal"] = f"{prev_g}; {glue}".strip("; ") if prev_g else glue
        merged["et_onboarding"] = _merge_et_onboarding(merged, phases, sel_norm)
        return {
            "merged_profile": merged,
            "profile_updates": {"goal": merged.get("goal", "")},
            "summary": "Saved your onboarding choices into your profile (offline mode).",
            "mode": "heuristic",
        }

    user = json.dumps(
        {
            "profile": profile,
            "phases": phases,
            "selections": sel_norm,
        },
        ensure_ascii=False,
        default=str,
    )
    try:
        data = chat_json(ONBOARDING_APPLY_SYSTEM, user, client=None, model_name=None)
        updates = _sanitize_updates(data.get("profile_updates"))
        summary = str(data.get("summary") or "").strip() or "Updated your profile from onboarding selections."
        merged = dict(profile)
        for k, v in updates.items():
            prev = str(merged.get(k) or "").strip()
            merged[k] = f"{prev}; {v}".strip("; ") if prev and v and v not in prev else (v or prev)
        merged["et_onboarding"] = _merge_et_onboarding(merged, phases, sel_norm)
        return {
            "merged_profile": merged,
            "profile_updates": updates,
            "summary": summary[:500],
            "mode": "llm",
        }
    except Exception:
        lines = []
        by_id = {p["phase_id"]: p for p in phases}
        for s in sel_norm:
            title = by_id.get(s["phase_id"], {}).get("title") or s["phase_id"]
            for c in s["chosen"]:
                lines.append(f"{title}: {c}")
        glue = " · ".join(lines)
        merged = dict(profile)
        prev_g = str(merged.get("goal") or "").strip()
        merged["goal"] = f"{prev_g}; {glue}".strip("; ") if prev_g else glue
        merged["et_onboarding"] = _merge_et_onboarding(merged, phases, sel_norm)
        return {
            "merged_profile": merged,
            "profile_updates": {"goal": merged.get("goal", "")},
            "summary": "Saved your onboarding choices (fallback merge).",
            "mode": "heuristic_fallback",
        }
