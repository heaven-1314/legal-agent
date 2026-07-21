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
    response_format: dict[str, Any] | None = None,
) -> dict[str, Any]:
    key = settings.resolve_ai_key()
    if not settings.ai_base or not key:
        raise LLMError("AI_BASE / AI_KEY (or new-api token) not configured")
    url = f"{settings.ai_base.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    body: dict[str, Any] = {
        "model": settings.ai_model,
        "messages": messages,
        "temperature": temperature,
    }
    if response_format is not None:
        body["response_format"] = response_format
    with httpx.Client(timeout=timeout) as client:
        r = client.post(url, headers=headers, json=body)
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            detail = (e.response.text or "")[:300]
            raise LLMError(f"LLM HTTP {e.response.status_code}: {detail}") from e
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
        "key_source": "env" if settings.ai_key.strip() else f"newapi:{settings.newapi_token_name}",
    }
