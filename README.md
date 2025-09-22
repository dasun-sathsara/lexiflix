# LexiFlix

AI-powered vocabulary learning from movies and TV.

## Overview

LexiFlix turns media consumption into an active learning process.  
It analyzes subtitles, curates vocabulary by CEFR level, and generates a pre-learning pack with definitions, audio, and visuals. Learners can review via flashcards with spaced repetition before watching.

## Features

-   CEFR-based placement and vocabulary curation
-   Subtitle analysis (spaCy, LLMs for idioms/slang)
-   AI-generated definitions, TTS audio, and contextual images
-   Flashcards with active recall + spaced repetition
-   Progress tracking, streaks, and notifications
-   Admin role with RBAC at the database level

## Tech Stack

-   **Frontend**: Next.js + Tailwind
-   **Backend**: Next.js API routes + Python Celery workers
-   **Database**: PostgreSQL (Drizzle migrations)
-   **Broker**: Redis
-   **Storage**: S3 (artifacts)
-   **AI/NLP**: LLM, spaCy, TTS, diffusion models
-   **APIs**: TMDB, OpenSubtitles

## Development

-   Web app: `apps/web`
-   Worker: `apps/worker`
