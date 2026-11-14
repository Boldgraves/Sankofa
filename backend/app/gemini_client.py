"""Gemini narration layer.

Scores are computed deterministically in scoring.py. Gemini only rewrites the
already-computed numbers into one short paragraph for the farmer. If no
GEMINI_API_KEY is configured, or the call fails, a rule-based sentence is
returned and the response is flagged generated=False so the UI never labels
template text as AI output.
"""

from __future__ import annotations

import logging
import os

import httpx

log = logging.getLogger("sankofa.gemini")

GEMINI_MODEL = "gemini-2.5-flash"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


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


def narrate(cards: list[dict], location: dict, climate: dict) -> dict:
    fallback = _fallback_text(cards, location)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or not cards:
        return {"text": fallback, "generated": False, "model": None}

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
        with httpx.Client(timeout=8.0) as client:
            response = client.post(
                ENDPOINT.format(model=GEMINI_MODEL),
                headers={"x-goog-api-key": api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 160},
                },
            )
            response.raise_for_status()
            payload = response.json()
        text = payload["candidates"][0]["content"]["parts"][0]["text"].strip()
        if not text:
            raise ValueError("empty narration")
        return {"text": text, "generated": True, "model": GEMINI_MODEL}
    except Exception as exc:
        log.warning("Gemini narration failed (%s); using rule-based text", exc)
        return {"text": fallback, "generated": False, "model": None}
