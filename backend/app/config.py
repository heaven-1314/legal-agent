"""Environment config. Secrets only from env / local new-api db — never hardcode keys."""
from __future__ import annotations

import sqlite3
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# This host maps new-api container 3000 -> host 3002 (see docker ps).
_DEFAULT_AI_BASE = "http://127.0.0.1:3002/v1"
# CLI display name grok-4.5[1M] is not a new-api channel; use registered id.
_DEFAULT_AI_MODEL = "grok-4.5"
_DEFAULT_NEWAPI_DB = Path("/data/new-api/data/one-api.db")
_DEFAULT_NEWAPI_TOKEN_NAME = "claude"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    legal_agent_data: Path = Path("/data/legal-agent")
    legal_agent_host: str = "127.0.0.1"
    legal_agent_port: int = 8091

    ai_base: str = _DEFAULT_AI_BASE
    ai_key: str = ""  # optional; empty -> read new-api token by name
    ai_model: str = _DEFAULT_AI_MODEL
    newapi_db: Path = _DEFAULT_NEWAPI_DB
    newapi_token_name: str = _DEFAULT_NEWAPI_TOKEN_NAME

    dev_token: str = "dev-local-token"
    cors_origins: str = (
        "http://127.0.0.1:3000,http://localhost:3000,"
        "http://127.0.0.1:8091,http://localhost:8091"
    )

    @property
    def uploads_dir(self) -> Path:
        return self.legal_agent_data / "uploads"

    @property
    def sqlite_path(self) -> Path:
        return self.legal_agent_data / "sqlite" / "legal_agent.db"

    @property
    def logs_dir(self) -> Path:
        return self.legal_agent_data / "logs"

    def resolve_ai_key(self) -> str:
        if self.ai_key.strip():
            return self.ai_key.strip()
        return _read_newapi_token(self.newapi_db, self.newapi_token_name)

    @property
    def ai_configured(self) -> bool:
        try:
            return bool(self.ai_base and self.resolve_ai_key())
        except Exception:
            return False


def _read_newapi_token(db_path: Path, name: str) -> str:
    if not db_path.is_file():
        return ""
    conn = sqlite3.connect(str(db_path))
    try:
        row = conn.execute(
            "SELECT key FROM tokens WHERE name=? AND status=1", (name,)
        ).fetchone()
        return (row[0] if row else "") or ""
    finally:
        conn.close()


@lru_cache
def get_settings() -> Settings:
    return Settings()


def ensure_data_dirs(settings: Settings | None = None) -> Settings:
    s = settings or get_settings()
    s.uploads_dir.mkdir(parents=True, exist_ok=True)
    s.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    s.logs_dir.mkdir(parents=True, exist_ok=True)
    return s
