"""Application settings loaded from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Environment-driven configuration for the NLP service.

    All values can be overridden with environment variables (case-insensitive).
    Pydantic-settings reads env vars matching the field names automatically.
    """

    # --- Service identity ---
    app_name: str = "lexiflix-nlp-service"
    app_version: str = "0.1.0"
    debug: bool = False

    # --- Auth ---
    api_key: str | None = None

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"

    # --- spaCy ---
    spacy_batch_size: int = 200

    # --- Pipeline defaults ---
    default_include_propn: bool = False
    default_dedup_lines: bool = True

    model_config = {"env_prefix": "NLP_", "env_file": ".env", "extra": "ignore"}


# Singleton – imported wherever settings are needed.
settings = Settings()
