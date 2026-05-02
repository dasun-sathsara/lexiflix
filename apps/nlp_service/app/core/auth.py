"""Shared-secret API key authentication for internal service-to-service calls."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.settings import settings

security = HTTPBearer(auto_error=False)


def require_api_key(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> None:
    """Validate the Bearer token against the configured shared API key.

    When ``NLP_API_KEY`` is not set, auth is skipped (local dev mode).
    When set, every request must include ``Authorization: Bearer <key>``.
    """
    if settings.api_key is None:
        return

    if credentials is None or credentials.credentials != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )
