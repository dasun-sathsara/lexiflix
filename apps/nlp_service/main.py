"""Entrypoint shim for running the NLP service directly.

Usage:
    uv run uvicorn app.main:app --reload
    # or:
    uv run python main.py
"""

from __future__ import annotations

import uvicorn

from app.core.settings import settings


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
