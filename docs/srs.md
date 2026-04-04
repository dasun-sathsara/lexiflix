# Introduction

## Purpose

This Software Requirements Specification (SRS) defines the current intended requirements for LexiFlix. It is aligned to the architecture in [architecture.md](/Users/pabasara/Dev/lexiflix/docs/architecture.md), the present repository structure, and the current product direction for a university demo application. Where older documents described retired infrastructure or speculative platform features, this document replaces those assumptions with the architecture the project is actually building.

## Document Conventions

This document follows a lightweight IEEE-style SRS structure, but it is written pragmatically for this project rather than as a formal compliance artifact.

- **Bold text** indicates important terms or emphasis.
- _Italic text_ indicates named system components or technical concepts.
- Functional requirements are listed per feature area.
- Scope is intentionally constrained to what supports a reliable demo and a clear product story.

## Product Scope

LexiFlix is a web application that prepares language learners for a movie or TV episode before they watch it. A learner selects a title, the system analyzes subtitle text, identifies useful vocabulary above the learner's current level, enriches those items with learning material, and delivers a study pack for pre-learning and later review.

LexiFlix is not a streaming platform. It does not host or play the underlying media. Its role is to improve comprehension and retention before the learner watches content elsewhere.

### Problem Statement

Language learners often use movies and television shows to improve English, but unfamiliar vocabulary interrupts comprehension and breaks immersion. Existing tools are usually reactive: the learner encounters a word, pauses playback, and looks it up. That workflow is disruptive and weak for retention.

LexiFlix addresses this by shifting the learning step earlier. Instead of helping only after confusion occurs, it generates a subtitle-derived pack in advance so the learner can study likely high-value vocabulary before watching.

### Aim and Objectives

**Aim:** Deliver a practical pre-learning workflow that turns subtitle content into CEFR-aware vocabulary study material for English learners.

**Objectives:**

1. Allow users to browse and select movies or TV shows using TMDB metadata.
2. Determine or store a learner proficiency level through a CEFR-oriented placement assessment and settings.
3. Generate subtitle-based vocabulary packs through an asynchronous workflow.
4. Use a narrow Python NLP service for tokenization, lemmatization, POS tagging, filtering, and candidate extraction.
5. Enrich selected vocabulary items with AI-generated learning material.
6. Present packs through a multimodal study experience with text, audio, and optional imagery.
7. Support later review through a spaced repetition style flashcard flow.

## References

1. LexiFlix Architecture: [architecture.md](/Users/pabasara/Dev/lexiflix/docs/architecture.md)
2. TMDB API Documentation: <https://developer.themoviedb.org/docs>
3. OpenSubtitles API Documentation: <https://opensubtitles.stoplight.io/>
4. Next.js Documentation: <https://nextjs.org/docs>
5. Trigger.dev Documentation: <https://trigger.dev/docs>
6. FastAPI Documentation: <https://fastapi.tiangolo.com/>
7. spaCy Documentation: <https://spacy.io/api>
8. Google Gemini API Documentation: <https://ai.google.dev/>

# Overall Description

![System Architecture Diagram](images/architecture_diagram.png)

## Product Perspective

LexiFlix is a Next.js-first system with a narrow internal Python service and managed background workflows.

The current product architecture is:

- **`apps/web` as the only public application surface** for UI, authentication, route handlers, and durable product-facing state transitions.
- **Trigger.dev Cloud** for long-running workflow orchestration.
- **`apps/nlp_service` FastAPI service** for internal subtitle analysis and vocabulary candidate extraction only.
- **Neon Postgres** as the durable system of record.
- **Cloudflare R2** for binary artifacts such as generated audio and images.
- **Gemini** as the only LLM provider.

The following older assumptions are explicitly out of date and are not part of the current design:

- Celery workers as the job orchestration layer
- Redis as a required broker or progress store
- S3/MinIO as the primary artifact storage target
- a second public backend for browser-facing APIs
- provider-agnostic multi-LLM routing as a baseline requirement

## System Boundaries

LexiFlix has four primary boundaries:

1. **Browser-facing application boundary**: the browser communicates only with the Next.js application.
2. **Workflow boundary**: Trigger.dev executes asynchronous generation workflows but is not the product system of record.
3. **Compute boundary**: the FastAPI service performs NLP analysis and returns structured results; it does not own auth, jobs, or user-facing state.
4. **Storage boundary**: Neon Postgres stores durable application truth, while R2 stores generated binary artifacts.

## Product Functions

LexiFlix provides the following core functionalities:

1. **Title Search**: Browse and search movies and TV shows using the TMDB API with filtering capabilities.
2. **Placement Assessment**: Adaptive assessment to determine user's CEFR proficiency level (A1--C2), with the ability to retake at any time.
3. **Pre-learning Pack Generation**: Automated pipeline that:
   - Fetches subtitles from OpenSubtitles
   - Performs NLP analysis (tokenization, lemmatization, POS tagging)
   - Filters vocabulary based on user's CEFR level
   - Generates LLM-powered definitions and example sentences
   - Creates TTS audio pronunciations
   - Produces contextual images
4. **Study Module**: Multimodal vocabulary review interface with text definitions, audio playback, and contextual images.
5. **SRS Flashcards**: Spaced repetition system with ratings (again/hard/good/easy) that dynamically adjust review intervals.
6. **Gamification**: Daily streak tracking and badge awards for learning milestones.
7. **Notifications**: Email and in-app reminders for due reviews and job completion.
8. **Administration**: User and role management.

## User Classes and Characteristics

| User Class         | Characteristics                                                                                                                                      | Responsibilities                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Registered learner | English-language learner using films or series to improve comprehension. Expected to have basic web literacy and access to external media platforms. | Sign up, complete assessment, browse titles, request packs, study vocabulary, manage preferences. |
| Administrator      | System operators with technical knowledge. Limited in number.                                                                                        | Manage user accounts, and monitor system health.                                                  |

## Operating Environment

**Client-side environment**

- Modern browser on desktop or mobile
- JavaScript enabled
- Audio playback support for pronunciation features

**Server-side environment**

- **Web app**: Next.js 15 on Node.js 22, deployed on Vercel
- **Database**: Postgres-compatible database, with Neon as the intended managed provider
- **Workflow engine**: Trigger.dev Cloud
- **NLP service**: Python 3.13 FastAPI service, containerized and deployed to a VPS
- **Object storage**: Cloudflare R2

## Design and Implementation Constraints

- LexiFlix is a **university demo project**, so architecture must favor low operational drag and understandable boundaries over enterprise-grade platform complexity.
- Only **English vocabulary learning** is in scope for the current system.
- The browser must not call internal infrastructure directly.
- The NLP service must remain narrow and must not expand into a second product backend.
- Gemini usage must remain behind internal adapters that can support live, record, replay, and mock behavior.
- The repo is not a unified workspace package; app commands must be run from the correct app or via the root `Taskfile.yml`.

## Assumptions and Dependencies

**Assumptions**

- Users have separate access to the media they plan to watch.
- Subtitle availability is sufficient for at least the demo titles that matter to the project.
- Users will either complete the placement assessment or provide enough preference data to support vocabulary filtering.

**Dependencies**

- TMDB API for title metadata
- OpenSubtitles or equivalent subtitle sourcing workflow
- Gemini for LLM-backed enrichment
- audio generation provider(s) for pronunciation assets
- image generation provider(s), if contextual imagery is enabled for a given pack
- Resend or equivalent email delivery provider for transactional mail where used

# External Interface Requirements

## User Interfaces

The system shall provide a responsive browser-based interface with the following primary surfaces:

1. **Landing and authentication flow**
2. **Dashboard**
3. **Browse/search experience for titles**
4. **Assessment flow**
5. **Pack detail and study views**
6. **Flashcard review flow**
7. **Profile and settings**

## Software Interfaces

| Interface           | Provider                    | Purpose                                                                        |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| TMDB API            | The Movie Database          | Search and retrieve movie or TV metadata and artwork                           |
| Subtitle source API | OpenSubtitles or equivalent | Retrieve subtitle files or subtitle text                                       |
| Gemini API          | Google                      | Generate definitions, explanations, examples, and related enrichment           |
| NLP analysis API    | Internal FastAPI service    | Analyze subtitle text and return vocabulary candidates                         |
| Postgres            | Neon                        | Persist users, assessments, preferences, jobs, packs, and related product data |
| Cloudflare R2       | Cloudflare                  | Store generated audio and image artifacts                                      |
| Email API           | Resend or equivalent        | Send verification, reset, and notification emails where enabled                |

## Communication Interfaces

- **HTTPS** for browser-to-web-app communication
- **HTTPS/JSON** for server-side communication with external providers
- **Internal HTTPS/HTTP** between Trigger.dev workflows and the internal NLP service, depending on environment
- **Polling through app-owned endpoints** for user-visible job status updates
- **Email (SMTP/API)** for transactional and notification delivery where enabled
- **Signed or controlled artifact access** for binary assets stored in R2

# System Features

## Authentication and Account Management

**Description:** Users authenticate to access personalized learning features and persisted study data.

**Priority:** High

**Functional Requirements:**

1. The system shall provide user registration and sign-in through the web application.
2. The system shall support secure session management.
3. The system shall support email verification and password reset flows.
4. The system shall isolate each user's data from other users.
5. The browser shall not authenticate directly against internal infrastructure or the NLP service.

## Title Search and Selection

**Description:** Users can browse and search for movies and TV shows to generate vocabulary packs.

**Priority:** High

**Functional Requirements:**

1. The system shall provide a search interface for querying movies and TV shows.
2. The system shall retrieve search results from the TMDB API.
3. The system shall display title metadata including name, poster, release year, and synopsis.
4. The system shall allow filtering by content type (movie or TV series).
5. The system shall cache frequently accessed title metadata in the local database.

## Placement Assessment

**Description:** An adaptive assessment system to determine the user's CEFR proficiency level.

**Priority:** High

**Functional Requirements:**

1. The system shall provide a placement assessment upon user registration.
2. The system shall present vocabulary-based questions to assess proficiency.
3. The system shall calculate and assign a CEFR level (A1--C2) upon completion.
4. The system shall store the assessed CEFR level in user preferences.
5. The system shall allow users to retake the assessment at any time.

## Pre-learning Pack Generation

**Description:** Automated generation of vocabulary learning packs from movie/TV subtitles.

**Priority:** High

**Functional Requirements:**

1. The system shall fetch subtitles for the selected title from OpenSubtitles API.
2. The system shall perform NLP analysis including tokenization, lemmatization, and POS tagging using spaCy.
3. The system shall filter stopwords and exclude named entities from vocabulary extraction.
4. The system shall map extracted vocabulary to CEFR levels.
5. The system shall filter vocabulary to prioritize items at or immediately above the user's CEFR level (i+1), while excluding known vocabulary.
6. The system shall generate definitions and example sentences using an LLM.
7. The system shall generate TTS audio pronunciations for each vocabulary item.
8. The system shall generate contextual images.
9. The system shall upload generated artifacts to object storage.
10. The system shall provide job progress updates during pack generation through the web application.
11. The system shall implement idempotency to prevent duplicate job creation.

## Study Module

**Description:** A multimodal interface for reviewing vocabulary pack items.

**Priority:** High

**Functional Requirements:**

1. The system shall display vocabulary items with definitions and example sentences.
2. The system shall provide audio playback for TTS pronunciations.
3. The system shall display contextual images associated with vocabulary items.
4. The system shall track study progress within each pack.

## SRS Flashcard System

**Description:** Spaced repetition flashcards for long-term vocabulary retention.

**Priority:** High

**Functional Requirements:**

1. The system shall create flashcards from studied vocabulary items.
2. The system shall display the word on the front and definition on the back of each card.
3. The system shall provide rating options: Again, Hard, Good, Easy.
4. The system shall present due cards for review based on calculated intervals.

## Gamification System

**Description:** Engagement features including streaks and badges.

**Priority:** Medium

**Functional Requirements:**

1. The system shall track daily learning streaks for each user.
2. The system shall award badges for achieving milestones.

## Notification System

**Description:** Email and in-app notifications for user engagement.

**Priority:** Medium

**Functional Requirements:**

1. The system shall send email reminders for due flashcard reviews.
2. The system shall notify users upon pack generation completion.
3. The system shall display in-app notifications for pending actions.

## User Preferences

**Description:** User-configurable settings for personalization.

**Priority:** Medium

**Functional Requirements:**

1. The system shall allow users to update their CEFR level manually.

# Other Nonfunctional Requirements

## Performance Requirements

1. Title browsing and search responses should feel interactive under normal network conditions.
2. Pack generation shall execute asynchronously so long-running analysis does not block the browser request path.
3. The user-facing status model may be coarse stage-based progress rather than exact percentage completion.

## Reliability Requirements

1. The system shall treat Postgres as the durable source of truth for product state.
2. The workflow layer shall support retries for transient failures.
3. Generation requests shall be safe against accidental duplicate submission through idempotent handling.
4. Failures in external providers shall surface as controlled application failures rather than silent corruption.

## Security Requirements

1. All public client-server communication shall use HTTPS.
2. The browser shall communicate only with the Next.js application.
3. Internal compute services shall not be exposed as user-facing APIs.
4. Application inputs shall be validated before use.
5. User data access shall be scoped so users can access only their own records.
6. Secrets shall be injected through environment configuration and shall not be committed to the repository.
7. Artifact access shall be controlled through signed URLs or equivalent application-managed access patterns.

## Maintainability Requirements

1. The web app shall remain the product center and the only public application surface.
2. The NLP service shall remain a narrow compute dependency.
3. The architecture shall avoid reintroducing Celery, Redis, or a second orchestration layer unless project requirements materially change.
4. AI integration shall remain behind internal adapters to support live, record, replay, and mock workflows.
5. Project documentation shall stay aligned with the actual architecture rather than older exploratory designs.

## Portability and Deployment Requirements

1. The web app shall be deployable on Vercel.
2. The NLP service shall be deployable as a container on the project's VPS.
3. Local development shall support a functionally similar architecture with different environment endpoints rather than a different system shape.

## Business Rules

1. Pack generation is personalized against the learner's current working level.
2. The web application is the sole authority for user-visible pack and job status.
3. Trigger.dev execution state shall not replace application database state as the product source of truth.
4. CEFR levels follow the standard ordering A1 < A2 < B1 < B2 < C1 < C2.
5. The current release scope targets English learning only.

# Appendix A - Glossary

| Term          | Definition                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------ |
| CEFR          | Common European Framework of Reference for Languages, a standard proficiency scale from A1 to C2 |
| Study pack    | A generated collection of vocabulary items and supporting learning material for a selected title |
| SRS           | Spaced repetition system used to schedule later review                                           |
| NLP           | Natural language processing used to analyze subtitle text                                        |
| LLM           | Large language model used for explanation and enrichment tasks                                   |
| Trigger.dev   | Managed workflow engine used for asynchronous generation orchestration                           |
| Neon Postgres | Managed Postgres database used as the durable system of record                                   |
| Cloudflare R2 | Object storage used for generated binary artifacts                                               |
| Idempotency   | Property ensuring duplicate submissions do not create unintended duplicate effects               |
| Gemini        | Google's model family used as the project's only LLM provider                                    |
