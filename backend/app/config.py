"""Environment config. Secrets only from env — never hardcode keys."""
from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    legal_agent_data: Path = Path("/data/legal-agent")
    legal_agent_host: str = "127.0.0.1"
    legal_agent_port: int = 8091

    ai_base: str = ""  # e.g. http://127.0.0.1:3000/v1
    ai_key: str = ""
    ai_model: str = "deepseek-v4-flash"

    dev_token: str = "dev-local-token"
    cors_origins: str = "http://127.0.0.1:3000,http://localhost:3000"

    @property
    def uploads_dir(self) -> Path:
        return self.legal_agent_data / "uploads"

    @property
    def sqlite_path(self) -> Path:
        return self.legal_agent_data / "sqlite" / "legal_agent.db"

    @property
    def logs_dir(self) -> Path:
        return self.legal_agent_data / "logs"


def get_settings() -> Settings:
    return Settings()


def ensure_data_dirs(settings: Settings | None = None) -> Settings:
    s = settings or get_settings()
    s.uploads_dir.mkdir(parents=True, exist_ok=True)
    s.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    s.logs_dir.mkdir(parents=True, exist_ok=True)
    return s
