"""OpenAI-compatible chat client (new-api)."""
from __future__ import annotations

from typing import Any

import httpx

from app.config import Settings


class LLMError(RuntimeError):
    pass


def chat_completion(
    settings: Settings,
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.2,
    timeout: float = 120.0,
) -> dict[str, Any]:
    if not settings.ai_base or not settings.ai_key:
        raise LLMError("AI_BASE / AI_KEY not configured")
    url = f"{settings.ai_base.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.ai_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": settings.ai_model,
        "messages": messages,
        "temperature": temperature,
    }
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json=body)
        r.raise_for_status()
        return r.json()


def probe_llm(settings: Settings) -> dict[str, Any]:
    """Minimal connectivity check; does not leak API key."""
    data = chat_completion(
        settings,
        [
            {"role": "system", "content": "Reply with exactly: ok"},
            {"role": "user", "content": "ping"},
        ],
        temperature=0,
        timeout=60.0,
    )
    content = data["choices"][0]["message"]["content"]
    return {
        "ok": True,
        "model": settings.ai_model,
        "base": settings.ai_base.rstrip("/"),
        "reply_preview": (content or "")[:200],
    }
