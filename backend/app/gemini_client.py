"""Gemini narration layer.

Scores are computed deterministically in scoring.py. Gemini only rewrites the
already-computed numbers into one short paragraph for the farmer. If no
GEMINI_API_KEY is configured, or the call fails, a rule-based sentence is
returned and the response is flagged generated=False so the UI never labels
template text as AI output.

Successful narrations are cached for six hours, keyed on the factors that change
the text (crop, zone, rainfall bucket, top score), so slider and priority tweaks
that land on the same story do not spend another request.
"""

from __future__ import annotations

import logging
import os
import time

import httpx

log = logging.getLogger("sankofa.gemini")

GEMINI_MODEL = "gemini-3.5-flash"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
TTL_SECONDS = 6 * 60 * 60
RAIN_BUCKET_MM = 50

# (crop, zone, rainfall bucket, top score) -> (fetched_at, payload)
_CACHE: dict[tuple, tuple[float, dict]] = {}


def _fallback_text(cards: list[dict], location: dict) -> str:
    if not cards:
        return "No rotations could be scored for this location."
    top = cards[0]
    return (
        f"For {location['zone']} conditions, {top['title']} scores {top['score']:.1f}/10 — "
        f"water {top['subscores']['water']:.1f}, soil {top['subscores']['soil']:.1f}, "
        f"market {top['subscores']['market']:.1f}. Moisture is the first constraint to check "
        f"with your extension officer before planting."
    )


def _cache_key(cards: list[dict], location: dict, climate: dict) -> tuple:
    """Identity of the story being narrated, not of the exact request."""
    top = cards[0]
    crop = top["crops"][0] if top.get("crops") else top["id"]
    rain = float(climate.get("seasonal_rainfall_mm") or 0)
    return (
        crop,
        location.get("zone"),
        int(round(rain / RAIN_BUCKET_MM)) * RAIN_BUCKET_MM,
        round(float(top["score"]), 1),
    )


def narrate(cards: list[dict], location: dict, climate: dict) -> dict:
    fallback = _fallback_text(cards, location)
    if not cards:
        return {"text": fallback, "generated": False, "model": None, "cached": False}

    key = _cache_key(cards, location, climate)
    now = time.time()
    hit = _CACHE.get(key)
    if hit and now - hit[0] < TTL_SECONDS:
        log.info("narration cache hit %s", key)
        return {**hit[1], "cached": True}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"text": fallback, "generated": False, "model": None, "cached": False}

    top = cards[:3]
    summary = "\n".join(
        f"- {c['title']}: {c['score']:.1f}/10 (water {c['subscores']['water']:.1f}, "
        f"soil {c['subscores']['soil']:.1f}, market {c['subscores']['market']:.1f}, "
        f"suitability {c['subscores']['yield']:.1f})"
        for c in top
    )
    prompt = (
        "You are narrating a pre-computed crop rotation ranking for a farmer in Ghana. "
        "Do not change any number, do not add new scores, and do not invent data. "
        "Write 2 sentences of plain, concrete guidance (max 55 words), no lists.\n\n"
        f"Location: {location.get('zone')} zone, seasonal rainfall "
        f"{climate.get('seasonal_rainfall_mm')} mm, mean temperature "
        f"{climate.get('mean_temp_c')} C.\nRotations:\n{summary}"
    )

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                ENDPOINT.format(model=GEMINI_MODEL),
                headers={"x-goog-api-key": api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 1024,
                        # 3.x models otherwise spend ~1,000+ tokens on hidden
                        # reasoning and stop mid-sentence with MAX_TOKENS.
                        "thinkingConfig": {"thinkingBudget": 0},
                    },
                },
            )
            response.raise_for_status()
            payload = response.json()
        candidate = payload["candidates"][0]
        # Join every text part untrimmed apart from whitespace: a response can be
        # split across parts, and only taking parts[0] silently drops the rest.
        text = "".join(
            part.get("text", "") for part in candidate.get("content", {}).get("parts", [])
        ).strip()
        if not text:
            raise ValueError("empty narration")
    except Exception as exc:
        log.warning("Gemini narration failed (%s); using rule-based text", exc)
        return {"text": fallback, "generated": False, "model": None, "cached": False}

    result = {
        "text": text,
        "generated": True,
        "model": GEMINI_MODEL,
        "finish_reason": candidate.get("finishReason"),
    }
    _CACHE[key] = (now, result)
    return {**result, "cached": False}
