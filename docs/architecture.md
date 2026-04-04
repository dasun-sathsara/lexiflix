# LexiFlix Architecture

## Purpose

This document defines the architecture we are actually building for LexiFlix. It is not a speculative future-state diagram and it is not a production readiness checklist. LexiFlix is a university demo application, so the architecture is optimized for fast iteration, understandable boundaries, low operational drag, and a reliable live demo. That constraint matters. It changes what “good architecture” means.

The core product goal is straightforward: a user selects a movie or show, the system analyzes subtitle content, identifies vocabulary above the user’s current level, enriches those items with useful learning material, and delivers a study pack before the user starts watching. The architecture exists to make that workflow dependable without forcing the team to operate more infrastructure than the project justifies.

## Architectural Position

LexiFlix is a Next.js-first application with a narrow Python compute service, managed background workflows, a relational database as the system of record, and object storage for generated artifacts. The web application remains the center of the product. It owns the user experience, authentication, durable state, and browser-facing APIs. Background processing exists to support the product, not to become a second product platform of its own.

That choice is deliberate. The earlier direction of Python plus Celery plus Redis plus a separate internal orchestration layer would have been defensible for a production-oriented system with sustained background throughput and a dedicated backend operations story. It is the wrong trade for this project. It would create more system than product. The current design keeps the pieces that matter, namely asynchronous generation and Python-based NLP, while removing the infrastructure that would slow development down.

## Chosen Stack

The public application is built in Next.js and hosted on Vercel. Trigger.dev Cloud handles long-running workflows and job orchestration. A narrow Python FastAPI service performs NLP analysis. The primary database is Neon Postgres. Cloudflare R2 stores generated artifacts such as audio and images. Gemini is the only LLM provider. AI requests are wrapped in internal adapters that support live calls, recorded responses, replay, and full mock mode for local development. The Python service is deployed as a container to an already rented VPS through a straightforward deployment pipeline.

This stack is intentionally asymmetric. The web app is fully managed because it should be easy to ship and preview. The workflow engine is managed because workflow orchestration is a solved problem we do not need to re-implement. The Python service is self-hosted because we already have the VPS, the workload is compute-heavy enough to justify controlling the runtime, and the service surface is small enough that operating one container is still simple. The architecture does not attempt to make every component equally abstract or equally portable. That would add ceremony without adding value.

## System Boundaries

The system has four meaningful boundaries. The first boundary is the browser-facing application. Only the Next.js app is exposed to end users. That means the browser interacts with one surface for authentication, product data, and job status. The frontend does not talk directly to Trigger.dev, the Python service, Gemini, or R2.

The second boundary is workflow orchestration. Trigger.dev owns the lifecycle of long-running jobs. It is responsible for retries, step sequencing, and coordinating slow work outside the request-response cycle. It is not the source of truth for user-visible product state. Trigger executes workflows; the application database records what those workflows mean in product terms.

The third boundary is compute. The Python service is not a general backend. It does not own jobs, queues, sessions, or browser-facing behavior. It accepts text input, runs NLP, and returns structured analysis. That is all. This narrowness is important because it keeps Python valuable without letting it spread into orchestration, persistence, and auth.

The fourth boundary is storage. Neon Postgres owns durable product truth. R2 owns binary artifacts. The database stores titles, jobs, packs, vocabulary, cards, reviews, and metadata about artifacts. R2 stores the artifacts themselves. This separation keeps the data model clear and avoids turning object storage into an accidental database or the database into a blob store.

## Why Next.js Stays at the Center

Next.js is already the natural center of the codebase. The existing repository structure, routing model, auth integration, and UI work are all concentrated in `apps/web`. Making the web application the single public surface reduces conceptual overhead. Authentication lives in one place. Authorization rules live in one place. Input validation and user data access live in one place. The application does not need a second public backend just to proxy the same domain model through another stack.

This is especially important for a demo project. When a bug shows up, the fastest path to understanding it is a small number of boundaries. The app should own the concepts that the user sees: jobs, packs, study items, and reviews. A clean architecture here is one where the user-facing domain remains legible, not one where responsibility is split across multiple services for the sake of theoretical purity.

## Why Trigger.dev Is the Workflow Engine

Trigger.dev solves the exact class of problem LexiFlix has: user-triggered background workflows that may take time, touch external services, and need retries without blocking the browser. The critical point is not that Trigger.dev is universally the best workflow platform. The critical point is that it is the best fit for this project’s current priorities. Those priorities are developer experience, implementation speed, and keeping orchestration in the same language and ecosystem as the web app.

The Trigger workflow model also keeps the product architecture honest. A pack-generation request starts in the web app. The app records the request durably in Postgres. Trigger then executes the workflow behind the scenes. When the frontend polls for progress, it does not ask Trigger directly. It asks the app, and the app reads durable job state from the database. That means the product does not become coupled to the internal API shape of the workflow platform.

Equally important is what we are not doing. We are not using Celery for queues, Redis for orchestration state, or a Python control plane for job execution. Those systems are powerful, but in this context they would create operational complexity that adds very little to the product. Trigger.dev lets us keep the asynchronous behavior without inheriting the full worker-stack burden.

## Why Python Still Exists

Python remains in the architecture because the NLP task is genuinely better served by Python today. The existing subtitle analysis code relies on spaCy, transformer-backed language processing, lemmatization, POS tagging, NER filtering, and CEFR-related analysis logic. That is not fake complexity. It is the part of the system where Python earns its place.

The architectural correction is not to remove Python at all costs. The correction is to stop using Python as the control plane. The Python service should be a narrow computational endpoint. It should accept subtitle text or normalized transcript content, run the NLP pipeline, and return structured vocabulary candidates. It should not manage queueing, progress coordination, or persistent product writes. Those concerns belong elsewhere.

This gives us a much healthier division of labor. TypeScript owns the product workflow and the integration story. Python owns the language-processing step. Neither side pretends to be the whole system.

## The Python Service Model

The Python service is a FastAPI application exposed internally over HTTP. Trigger.dev calls it synchronously as a single workflow step. That detail is important. The NLP stage is one stage in the larger workflow, not a second background job system nested inside the first.

In practice, a pack-generation workflow enters a `running_nlp` stage, sends a request to the FastAPI service, waits for the response, and then continues. The call is synchronous from the workflow’s perspective, but not from the browser’s perspective. The browser remains decoupled because the long-running work is already off the request path.

This is the simplest reliable model for the current project. It avoids Celery. It avoids Python-side polling. It avoids needing Python to publish job completion. It allows the NLP logic to stay computationally rich while keeping the overall system understandable.

## Hosting and Deployment

The web app is deployed on Vercel because that is the lowest-friction hosting path for a Next.js application. Preview deployments are straightforward, production deploys are straightforward, and the hosting model aligns with the project’s need for fast iteration. There is no meaningful benefit to self-hosting the frontend for this project.

The Python service is deployed as a container to an already rented VPS. This decision is intentionally pragmatic. Managed container platforms such as Fargate or App Runner are attractive in isolation, but they add new infrastructure surfaces, new account-level complexity, and new deployment concerns. Since the project already has VPS capacity and the Python service is a single narrow microservice, a containerized VPS deployment is the cleaner trade. It gives us direct control over the CPU-heavy NLP runtime without expanding the platform footprint.

The deployment model for the Python service should stay simple. Build a container image, ship it to the VPS through a CI/CD pipeline, restart the service, and keep the interface stable. This is enough. Full infrastructure-as-code for a demo project would be harder to justify than it would be useful.

## Data Ownership

Neon Postgres is the durable system of record. It stores user-facing truth: who the user is, what title they selected, whether a generation job exists, which pack was produced, which vocabulary items are canonical, and how the spaced repetition system evolves over time.

This matters because asynchronous systems often drift into a bad habit of treating workflow engines as primary state. LexiFlix should not do that. Trigger.dev knows how a workflow is executing, but Neon knows what that execution means in product terms. A `jobs` row exists because the application wants to track a user-visible generation task. A `packs` row exists because the user needs a durable study resource. A `cards` row exists because review scheduling is part of the product, not an internal workflow concern.

Cloudflare R2 complements the database by storing the large generated artifacts. Audio clips, generated images, and similar assets belong there. The database only needs references, ownership, and metadata. This keeps the core domain relational and queryable while keeping the artifact layer operationally simple.

The database also stores subtitle availability results, including negative outcomes, so the product can explain when subtitle-backed generation is unavailable instead of blindly retrying the same missing provider lookup. This is a small addition, but it materially improves demo behavior and keeps provider interactions disciplined.

## The Pack Generation Workflow

The core workflow begins when the user requests a pack for a selected title. The Next.js app validates the request, computes an idempotency key, and creates or reuses a `jobs` row in Postgres. That row is the durable anchor for everything that follows. If the request is new, the app triggers a Trigger.dev workflow and returns the job handle to the frontend.

The workflow then proceeds through a small number of meaningful stages. It loads title and user context, fetches subtitles, calls the Python NLP service, filters candidates relative to the learner’s level, enriches items through Gemini, optionally generates audio and image artifacts, uploads those artifacts to R2, persists the resulting pack and related entities, and finally marks the job as completed or failed.

The sequence matters less than the ownership model. Trigger owns the sequence. Postgres owns the durable meaning of the sequence. Python owns the NLP computation inside one stage of the sequence. Gemini owns the language-model generation inside later stages. No component is allowed to “quietly” become the real source of truth for another layer.

## Progress Reporting

The easiest progress model is also the correct one for this project: coarse stage-based progress stored in Postgres and polled by the frontend through the web app. We do not need Redis for this. We do not need WebSockets. We do not need fine-grained real-time streaming of sub-steps.

That does not mean the user sees nothing. The job can move through meaningful stages such as `queued`, `fetching_subtitles`, `running_nlp`, `generating_content`, `saving_pack`, `completed`, and `failed`. The frontend can poll the app every few seconds and display the current stage with an indeterminate progress treatment. For a demo, this is exactly the right balance. It feels alive without forcing us to invent fake percentages or build an ephemeral progress infrastructure that adds more moving parts than value.

The key principle is that durable status belongs in the database, while highly transient ticks do not belong anywhere until they are proven necessary. If the project later needs richer progress, that can be added with a transient store. It should not be the baseline.

## AI Integration and Cost Control

Gemini is the only LLM provider in the architecture. That is not because provider abstraction is impossible. It is because a demo project does not benefit from carrying an artificial multi-provider layer unless it solves a real problem. Right now, the real problem is not model routing. The real problem is keeping local development cheap and deterministic.

To solve that, all Gemini calls should go through one internal adapter layer. That adapter is responsible for request construction, prompt versioning, and four execution modes: live, record, replay, and mock. In live mode, it calls Gemini directly. In record mode, it calls Gemini and saves the normalized response under a stable request fingerprint. In replay mode, it skips the API call and reuses the stored response. In mock mode, it returns deterministic fake output suitable for local development and UI work.

This is more useful than a gateway-level caching story because it solves the actual local development problem. The team does not need another network service to manage AI requests. It needs the ability to work on the app repeatedly without burning budget or waiting on model APIs every time.

For persistence, the application treats pipeline-derived JSONB payloads as a single active contract, not as a versioned compatibility matrix. If the NLP or LLM output shape changes in a breaking way, the expected maintenance path is to purge and rebuild the affected derived data. That is the correct trade for a demo app with rebuildable pipeline state; carrying multiple generations of compatibility parsing would create more system than product.

## Local Development and Production Differences

The architecture intentionally behaves differently in local development and deployed environments, but in a controlled way. Locally, the Next.js app runs on the developer machine, Trigger tasks run in local development mode, and the Python service can run on `localhost`. In that setup, the workflow can call the local FastAPI service directly.

In deployed environments, the web app runs on Vercel, Trigger tasks execute in Trigger.dev Cloud, and the Python service runs on the VPS. The workflow then calls the deployed service URL instead of localhost. The important point is that the architecture itself does not change. Only the addresses and environment configuration change.

That consistency is valuable because it keeps the mental model stable. The workflow still calls one Python service. The frontend still polls the app. The app still reads progress from Postgres. Local development should feel like a lightweight version of the same system, not a completely different architecture.

## Security and Exposure

Only the Next.js application is intended to be public-facing. The Python service is an internal compute dependency and should be treated as such, even if it is reachable over the network. It should not become a user-facing API. The browser should not call it. Trigger.dev should call it. The web app should own all end-user authentication and authorization.

R2 objects should also be treated conservatively. Artifact access should be controlled by the app, either through signed URLs or application-mediated access patterns. The architecture should not accidentally turn storage into an open public CDN of generated outputs.

Secrets belong in environment configuration, not in the repository. For this project, the practical secret-management model is to use Doppler as the source of truth, sync the web-facing values into Vercel as needed, and inject the correct runtime configuration into the VPS-deployed Python service through the deployment pipeline.

## Why This Architecture Is Right for This Project

This architecture is not minimal in the abstract, but it is minimal relative to the product requirements. It preserves the important pieces: asynchronous workflows, Python-based NLP, relational product state, generated artifacts, and AI-backed enrichment. At the same time, it strips away systems that would mostly serve architecture itself rather than the project.

It avoids a Celery-and-Redis worker stack that would be operationally expensive for a demo. It avoids turning Python into the entire platform. It avoids pretending the frontend should care about the workflow engine directly. It avoids inventing a sophisticated progress architecture just to animate a loading state. It avoids provider abstraction that does not solve today’s problem.

Instead, it makes a more disciplined trade. The product lives in Next.js. Workflows live in Trigger.dev. NLP lives in Python. Durable truth lives in Postgres. Artifacts live in R2. Local development remains cheap through replay and mocks. Deployment remains understandable because the public app is managed and the private compute service is just one container on one server.

That is the right architecture for LexiFlix as it exists now.
