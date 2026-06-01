import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type {
  ArtifactMetadata,
  AssessmentAttemptState,
  AssessmentLevelProbabilities,
  ContentAnalysisSummary,
  CuratedCurationScope,
  CuratedGenreSnapshot,
  CuratedMediaType,
  CuratedSourceProvider,
  ExampleSentenceAudioArtifactList,
  ExampleSentenceList,
  GenerationRequestSnapshot,
  NlpCandidateContext,
  NotificationPayload,
  ProcessingWarningList,
  TmdbRawPayload,
  WorkflowEventPayload,
} from "./json-contracts";

/*
  The schema keeps current pipeline-derived JSONB contracts typed, but intentionally not versioned.
  If NLP or LLM payload shapes change in a breaking way, purge and rebuild the affected derived
  data instead of accumulating compatibility layers in the application schema.
*/

const auditColumns = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
};

export const userRoleEnum = pgEnum("user_role", ["learner", "admin"]);
export const curatedSourceProviderEnum = pgEnum("curated_source_provider", ["tmdb"]);
export const curatedMediaTypeEnum = pgEnum("curated_media_type", ["movie", "tv"]);
export const curationScopeEnum = pgEnum("curation_scope", ["movie", "show", "season"]);
export const cefrLevelEnum = pgEnum("cefr_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const assessmentAttemptStatusEnum = pgEnum("assessment_attempt_status", [
  "in_progress",
  "completed",
]);
export const contentKindEnum = pgEnum("content_kind", ["movie", "season"]);
export const artifactKindEnum = pgEnum("artifact_kind", ["audio", "image", "avatar"]);
export const artifactAccessEnum = pgEnum("artifact_access", ["private", "signed", "public"]);
export const runStatusEnum = pgEnum("run_status", ["queued", "running", "completed", "failed"]);
export const contentAnalysisStageEnum = pgEnum("content_analysis_stage", [
  "queued",
  "fetching_subtitles",
  "running_nlp",
  "running_llm",
  "merging_analysis",
  "saving_analysis",
  "completed",
  "failed",
]);
export const analysisSourceEnum = pgEnum("analysis_source", ["nlp", "analysis_llm"]);
export const vocabularyKindEnum = pgEnum("vocabulary_kind", [
  "word",
  "phrasal_verb",
  "idiom",
  "slang",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export const packGenerationStageEnum = pgEnum("pack_generation_stage", [
  "queued",
  "selecting_terms",
  "generating_content",
  "generating_assets",
  "saving_pack",
  "completed",
  "failed",
]);
export const frequencyPreferenceEnum = pgEnum("frequency_preference", [
  "balanced",
  "common_first",
  "challenge_first",
]);
export const packStatusEnum = pgEnum("pack_status", ["active", "archived"]);
export const cardStateEnum = pgEnum("card_state", [
  "new",
  "learning",
  "due",
  "mastered",
  "removed",
]);
export const reviewRatingEnum = pgEnum("review_rating", ["again", "hard", "good", "easy"]);
export const userTermStateEnum = pgEnum("user_term_state_value", [
  "unseen",
  "learning",
  "known",
  "ignored",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "pack_ready",
  "reviews_due",
  "streak_risk",
  "system",
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["in_app", "email"]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "read",
  "dismissed",
  "failed",
]);

/*
  Better Auth core tables remain first-class because the existing app already depends on them.
*/
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("learner").notNull(),
  ...auditColumns,
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...auditColumns,
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...auditColumns,
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...auditColumns,
});

/*
  Learner profile and preferences.
  Preferences store machine-friendly codes, while the UI can still map them to labels.
*/
export const cefrProfile = pgTable("cefr_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  assessedLevel: cefrLevelEnum("assessed_level"),
  assessedConfidence: real("assessed_confidence"),
  assessedAt: timestamp("assessed_at"),
  manualOverrideLevel: cefrLevelEnum("manual_override_level"),
  manualOverrideAt: timestamp("manual_override_at"),
  ...auditColumns,
});

export const cefrAssessmentAttempt = pgTable("cefr_assessment_attempt", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: assessmentAttemptStatusEnum("status").default("in_progress").notNull(),
  state: jsonb("state").$type<AssessmentAttemptState>().notNull(),
  answeredCount: integer("answered_count").default(0).notNull(),
  thetaMean: real("theta_mean"),
  thetaLow: real("theta_low"),
  thetaHigh: real("theta_high"),
  level: cefrLevelEnum("level"),
  confidence: real("confidence"),
  borderlineLabel: text("borderline_label"),
  levelProbabilities: jsonb("level_probabilities").$type<AssessmentLevelProbabilities>(),
  completedAt: timestamp("completed_at"),
  ...auditColumns,
});

export const cefrAssessmentResponse = pgTable(
  "cefr_assessment_response",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => cefrAssessmentAttempt.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    itemLevel: cefrLevelEnum("item_level").notNull(),
    itemDifficulty: real("item_difficulty").notNull(),
    sequence: integer("sequence").notNull(),
    selectedIndex: integer("selected_index"),
    isDontKnow: boolean("is_dont_know").default(false).notNull(),
    isCorrect: boolean("is_correct").notNull(),
    responseTimeMs: integer("response_time_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cefr_assessment_response_attempt_item_unique").on(table.attemptId, table.itemId),
  ],
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  studyLanguageCode: text("study_language_code").default("en").notNull(),
  newCardsPerDay: integer("new_cards_per_day").default(20).notNull(),
  frequencyPreference: frequencyPreferenceEnum("frequency_preference")
    .default("balanced")
    .notNull(),
  studyVocabularyTypes: vocabularyKindEnum("study_vocabulary_types")
    .array()
    .default(sql`ARRAY['word', 'phrasal_verb', 'idiom', 'slang']::vocabulary_kind[]`)
    .notNull(),
  generationPackSizeDefault: integer("generation_pack_size_default").default(20).notNull(),
  generationCefrWindowMode: text("generation_cefr_window_mode").default("same_level").notNull(),
  generationKnownTermHandling: text("generation_known_term_handling")
    .default("exclude_known")
    .notNull(),
  generationAudioVoiceGenderDefault: text("generation_audio_voice_gender_default")
    .default("female")
    .notNull(),
  generationExampleSentenceCount: integer("generation_example_sentence_count").default(1).notNull(),
  generationCustomInstructionsDefault: text("generation_custom_instructions_default"),
  emailRemindersEnabled: boolean("email_reminders_enabled").default(true).notNull(),
  streakAlertsEnabled: boolean("streak_alerts_enabled").default(true).notNull(),
  ...auditColumns,
});

/*
  Cached TMDB-backed learning targets.

  Movies are canonical by TMDB movie ID.
  Seasons are canonical by (tmdb_show_id, season_number).
*/
export const content = pgTable(
  "content",
  {
    id: text("id").primaryKey(),
    kind: contentKindEnum("kind").notNull(),
    tmdbMovieId: integer("tmdb_movie_id"),
    tmdbShowId: integer("tmdb_show_id"),
    tmdbSeasonNumber: integer("tmdb_season_number"),
    tmdbSeasonId: integer("tmdb_season_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    // Normalize TMDB empty-string overviews to NULL on ingest.
    overview: text("overview"),
    originalLanguage: text("original_language"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    releaseDate: timestamp("release_date"),
    firstAirDate: timestamp("first_air_date"),
    runtimeMinutes: integer("runtime_minutes"),
    episodeCount: integer("episode_count"),
    voteAverage: real("vote_average"),
    voteCount: integer("vote_count"),
    tmdbRaw: jsonb("tmdb_raw").$type<TmdbRawPayload>(),
    lastTmdbSyncedAt: timestamp("last_tmdb_synced_at"),
    ...auditColumns,
  },
  (table) => [
    check(
      "content_movie_shape_check",
      sql`(${table.kind} <> 'movie') OR (${table.tmdbMovieId} IS NOT NULL AND ${table.tmdbShowId} IS NULL AND ${table.tmdbSeasonNumber} IS NULL)`,
    ),
    check(
      "content_season_shape_check",
      sql`(${table.kind} <> 'season') OR (${table.tmdbShowId} IS NOT NULL AND ${table.tmdbSeasonNumber} IS NOT NULL AND ${table.tmdbMovieId} IS NULL)`,
    ),
    uniqueIndex("content_movie_tmdb_unique")
      .on(table.tmdbMovieId)
      .where(sql`${table.kind} = 'movie'`),
    uniqueIndex("content_season_tmdb_unique")
      .on(table.tmdbShowId, table.tmdbSeasonNumber)
      .where(sql`${table.kind} = 'season'`),
    index("content_kind_idx").on(table.kind),
  ],
);

export const curatedEntry = pgTable(
  "curated_entry",
  {
    id: text("id").primaryKey(),
    sourceProvider: curatedSourceProviderEnum("source_provider")
      .$type<CuratedSourceProvider>()
      .default("tmdb")
      .notNull(),
    mediaType: curatedMediaTypeEnum("media_type").$type<CuratedMediaType>().notNull(),
    curationScope: curationScopeEnum("curation_scope").$type<CuratedCurationScope>().notNull(),
    tmdbId: integer("tmdb_id").notNull(),
    tmdbTvId: integer("tmdb_tv_id"),
    tmdbSeasonNumber: integer("tmdb_season_number"),
    tmdbSeasonId: integer("tmdb_season_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title").notNull(),
    displaySubtitle: text("display_subtitle"),
    overview: text("overview"),
    releaseDate: date("release_date", { mode: "string" }),
    releaseYear: integer("release_year"),
    decade: integer("decade"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    originalLanguage: text("original_language"),
    originCountries: text("origin_countries").array().default(sql`ARRAY[]::text[]`).notNull(),
    genreIds: integer("genre_ids").array().default(sql`ARRAY[]::integer[]`).notNull(),
    genres: jsonb("genres").$type<CuratedGenreSnapshot[]>().default(sql`'[]'::jsonb`).notNull(),
    imdbId: text("imdb_id"),
    contentRating: text("content_rating"),
    tmdbPopularity: numeric("tmdb_popularity", { precision: 10, scale: 3 }),
    voteAverage: numeric("vote_average", { precision: 4, scale: 2 }),
    voteCount: integer("vote_count"),
    seasonCountSnapshot: integer("season_count_snapshot"),
    tmdbSnapshot: jsonb("tmdb_snapshot").$type<TmdbRawPayload>().notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    featuredRank: integer("featured_rank"),
    contentId: text("content_id").references(() => content.id, { onDelete: "set null" }),
    curatedByUserId: text("curated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    level: cefrLevelEnum("level"),
    curatedAt: timestamp("curated_at"),
    lastTmdbSyncedAt: timestamp("last_tmdb_synced_at"),
    ...auditColumns,
  },
  (table) => [
    check(
      "curated_entry_movie_scope_check",
      sql`(${table.curationScope} <> 'movie') OR (${table.mediaType} = 'movie' AND ${table.tmdbTvId} IS NULL AND ${table.tmdbSeasonNumber} IS NULL AND ${table.tmdbSeasonId} IS NULL)`,
    ),
    check(
      "curated_entry_show_scope_check",
      sql`(${table.curationScope} <> 'show') OR (${table.mediaType} = 'tv' AND ${table.tmdbSeasonNumber} IS NULL AND ${table.tmdbSeasonId} IS NULL)`,
    ),
    check(
      "curated_entry_season_scope_check",
      sql`(${table.curationScope} <> 'season') OR (${table.mediaType} = 'tv' AND ${table.tmdbTvId} IS NOT NULL AND ${table.tmdbSeasonNumber} IS NOT NULL)`,
    ),
    uniqueIndex("curated_entry_media_tmdb_unique").on(table.mediaType, table.tmdbId),
    index("curated_entry_published_rank_idx").on(table.isPublished, table.featuredRank),
    index("curated_entry_media_type_idx").on(table.mediaType),
    index("curated_entry_scope_idx").on(table.curationScope),
    index("curated_entry_content_id_idx").on(table.contentId),
    index("curated_entry_curated_by_user_id_idx").on(table.curatedByUserId),
  ],
);

/*
  Generic object-storage metadata.
  The DB stores object facts and ownership, not the binary payloads themselves.
*/
export const artifactObject = pgTable(
  "artifact_object",
  {
    id: text("id").primaryKey(),
    kind: artifactKindEnum("kind").notNull(),
    access: artifactAccessEnum("access").default("private").notNull(),
    provider: text("provider").default("r2").notNull(),
    bucketName: text("bucket_name").notNull(),
    objectKey: text("object_key").notNull(),
    publicUrl: text("public_url"),
    mimeType: text("mime_type"),
    byteSize: integer("byte_size"),
    checksumSha256: text("checksum_sha256"),
    metadata: jsonb("metadata").$type<ArtifactMetadata>(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("artifact_object_bucket_key_unique").on(table.bucketName, table.objectKey),
    index("artifact_object_kind_idx").on(table.kind),
  ],
);

/*
  Canonical reusable content-analysis run for one content item and analysis pipeline fingerprint.
  Subtitle fetching is transient runtime input; only the derived analysis is persisted.
*/
export const contentAnalysisRun = pgTable(
  "content_analysis_run",
  {
    id: text("id").primaryKey(),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    status: runStatusEnum("status").default("queued").notNull(),
    stage: contentAnalysisStageEnum("stage").default("queued").notNull(),
    progressMessage: text("progress_message"),
    pipelineFingerprint: text("pipeline_fingerprint").notNull(),
    nlpPipelineVersion: text("nlp_pipeline_version").notNull(),
    analysisLlmPipelineVersion: text("analysis_llm_pipeline_version").notNull(),
    analysisLlmPromptVersion: text("analysis_llm_prompt_version"),
    summary: jsonb("summary").$type<ContentAnalysisSummary>(),
    warnings: jsonb("warnings").$type<ProcessingWarningList>(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("content_analysis_run_fingerprint_unique").on(
      table.contentId,
      table.pipelineFingerprint,
    ),
    index("content_analysis_run_status_idx").on(table.status),
    index("content_analysis_run_stage_idx").on(table.stage),
  ],
);

/*
  Immutable event trail for reusable content-analysis runs.
  This gives the overview page something durable to poll without making the browser care about
  Trigger.dev directly.
*/
export const contentAnalysisRunEvent = pgTable(
  "content_analysis_run_event",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => contentAnalysisRun.id, { onDelete: "cascade" }),
    stage: contentAnalysisStageEnum("stage").notNull(),
    message: text("message"),
    payload: jsonb("payload").$type<WorkflowEventPayload>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("content_analysis_run_event_run_stage_idx").on(table.runId, table.stage)],
);

/*
  Canonical reusable vocabulary term or phrase.
  Cross-title mastery anchors here, while content-specific evidence stays on contentAnalysisItem.
*/
export const vocabularyTerm = pgTable(
  "vocabulary_term",
  {
    id: text("id").primaryKey(),
    kind: vocabularyKindEnum("kind").notNull(),
    normalizedText: text("normalized_text").notNull(),
    lemma: text("lemma"),
    displayText: text("display_text").notNull(),
    partOfSpeech: text("part_of_speech"),
    baseCefrLevel: cefrLevelEnum("base_cefr_level"),
    baseCefrNumeric: integer("base_cefr_numeric"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("vocabulary_term_kind_text_unique").on(table.kind, table.normalizedText),
    index("vocabulary_term_kind_idx").on(table.kind),
  ],
);

/*
  Reusable content-analysis output from the NLP pipeline and the batched analysis LLM pipeline.
  This table intentionally stops at reusable analysis data and does not store user-specific pack
  generation output such as meanings, example sentences, or audio assets.
  `contexts` intentionally mirrors the current NLP service candidate context contract.
*/
export const contentAnalysisItem = pgTable(
  "content_analysis_item",
  {
    id: text("id").primaryKey(),
    analysisRunId: text("analysis_run_id")
      .notNull()
      .references(() => contentAnalysisRun.id, { onDelete: "cascade" }),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "restrict" }),
    analysisSource: analysisSourceEnum("analysis_source").notNull(),
    surfaceForm: text("surface_form").notNull(),
    representativeContext: text("representative_context"),
    contexts: jsonb("contexts").$type<NlpCandidateContext[]>(),
    occurrenceCount: integer("occurrence_count").default(1).notNull(),
    frequencyRank: integer("frequency_rank"),
    cefrLevel: cefrLevelEnum("cefr_level"),
    cefrNumeric: integer("cefr_numeric"),
    cefrConfidence: real("cefr_confidence"),
    cefrNote: text("cefr_note"),
    isSelectable: boolean("is_selectable").default(true).notNull(),
    filteredOutReason: text("filtered_out_reason"),
    analyzedAt: timestamp("analyzed_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("content_analysis_item_run_term_unique").on(table.analysisRunId, table.termId),
    index("content_analysis_item_content_idx").on(table.contentId),
    index("content_analysis_item_term_idx").on(table.termId),
    index("content_analysis_item_source_idx").on(table.analysisSource),
  ],
);

/*
  User-visible pack-generation job. This is what the frontend polls after a learner chooses
  generation preferences from the media overview page.
*/
export const packGenerationJob = pgTable(
  "pack_generation_job",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    analysisRunId: text("analysis_run_id").references(() => contentAnalysisRun.id, {
      onDelete: "set null",
    }),
    status: jobStatusEnum("status").default("queued").notNull(),
    stage: packGenerationStageEnum("stage").default("queued").notNull(),
    progressMessage: text("progress_message"),
    idempotencyKey: text("idempotency_key").notNull(),
    triggerWorkflowId: text("trigger_workflow_id"),
    requestSnapshot: jsonb("request_snapshot").$type<GenerationRequestSnapshot>().notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("pack_generation_job_user_idempotency_unique").on(
      table.userId,
      table.idempotencyKey,
    ),
    index("pack_generation_job_content_status_idx").on(table.contentId, table.status),
    index("pack_generation_job_user_status_idx").on(table.userId, table.status),
  ],
);

/*
  Immutable stage/event history for pack-generation jobs.
*/
export const packGenerationJobEvent = pgTable(
  "pack_generation_job_event",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => packGenerationJob.id, { onDelete: "cascade" }),
    stage: packGenerationStageEnum("stage").notNull(),
    message: text("message"),
    payload: jsonb("payload").$type<WorkflowEventPayload>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("pack_generation_job_event_job_stage_idx").on(table.jobId, table.stage)],
);

/*
  Exactly one pack exists per user per content item.
  Regeneration replaces the previous pack instead of versioning it.
*/
export const pack = pgTable(
  "pack",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentId: text("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    sourceJobId: text("source_job_id").references(() => packGenerationJob.id, {
      onDelete: "set null",
    }),
    analysisRunId: text("analysis_run_id")
      .notNull()
      .references(() => contentAnalysisRun.id, { onDelete: "restrict" }),
    status: packStatusEnum("status").default("active").notNull(),
    name: text("name").notNull(),
    learnerCefrLevelAtGeneration: cefrLevelEnum("learner_cefr_level_at_generation"),
    frequencyPreferenceAtGeneration: frequencyPreferenceEnum(
      "frequency_preference_at_generation",
    ).notNull(),
    selectedVocabularyTypes: vocabularyKindEnum("selected_vocabulary_types").array().notNull(),
    contentGenerationPipelineVersion: text("content_generation_pipeline_version").notNull(),
    contentGenerationPromptVersion: text("content_generation_prompt_version"),
    itemCount: integer("item_count").default(0).notNull(),
    estimatedStudyMinutes: integer("estimated_study_minutes"),
    archivedAt: timestamp("archived_at"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("pack_user_content_unique").on(table.userId, table.contentId),
    index("pack_status_idx").on(table.status),
  ],
);

/*
  Pack item = current flashcard row.
  Mutable SRS state lives here; immutable review history lives in reviewEvent.
*/
export const packItem = pgTable(
  "pack_item",
  {
    id: text("id").primaryKey(),
    packId: text("pack_id")
      .notNull()
      .references(() => pack.id, { onDelete: "cascade" }),
    contentAnalysisItemId: text("content_analysis_item_id")
      .notNull()
      .references(() => contentAnalysisItem.id, { onDelete: "restrict" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
    includedReason: text("included_reason"),
    state: cardStateEnum("state").default("new").notNull(),
    dueAt: timestamp("due_at"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    lastRating: reviewRatingEnum("last_rating"),
    repetitionCount: integer("repetition_count").default(0).notNull(),
    lapseCount: integer("lapse_count").default(0).notNull(),
    intervalDays: integer("interval_days"),
    easeFactor: real("ease_factor").default(2.5).notNull(),
    firstStudiedAt: timestamp("first_studied_at"),
    masteredAt: timestamp("mastered_at"),
    removedAt: timestamp("removed_at"),
    removalReason: text("removal_reason"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("pack_item_pack_candidate_unique").on(table.packId, table.contentAnalysisItemId),
    uniqueIndex("pack_item_pack_sort_order_unique").on(table.packId, table.sortOrder),
    index("pack_item_pack_state_idx").on(table.packId, table.state),
    index("pack_item_due_idx").on(table.state, table.dueAt),
    index("pack_item_term_idx").on(table.termId),
    check("pack_item_state_not_persisted_due", sql`${table.state} <> 'due'`),
  ],
);

/*
  User-specific output of the content-generation pipeline for one pack item.
  Text, audio, and optional imagery live here rather than on reusable analysis rows.
  Generation is personalized against the learner state captured on the owning pack, including
  the learner CEFR level at generation time.
*/
export const packItemContent = pgTable(
  "pack_item_content",
  {
    packItemId: text("pack_item_id")
      .primaryKey()
      .references(() => packItem.id, { onDelete: "cascade" }),
    meaning: text("meaning"),
    exampleSentences: jsonb("example_sentences").$type<ExampleSentenceList>(),
    audioArtifactId: text("audio_artifact_id").references(() => artifactObject.id, {
      onDelete: "set null",
    }),
    exampleSentenceAudioArtifactIds: jsonb(
      "example_sentence_audio_artifact_ids",
    ).$type<ExampleSentenceAudioArtifactList>(),
    imageArtifactId: text("image_artifact_id").references(() => artifactObject.id, {
      onDelete: "set null",
    }),
    generatedAt: timestamp("generated_at"),
    ...auditColumns,
  },
  (table) => [
    index("pack_item_content_audio_idx").on(table.audioArtifactId),
    index("pack_item_content_image_idx").on(table.imageArtifactId),
  ],
);

/*
  Immutable review history.
  V1 keeps this intentionally thin instead of storing large before/after state snapshots.
*/
export const reviewEvent = pgTable(
  "review_event",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    packItemId: text("pack_item_id")
      .notNull()
      .references(() => packItem.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "restrict" }),
    rating: reviewRatingEnum("rating").notNull(),
    reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
    responseTimeMs: integer("response_time_ms"),
  },
  (table) => [
    index("review_event_user_reviewed_at_idx").on(table.userId, table.reviewedAt),
    index("review_event_pack_item_reviewed_at_idx").on(table.packItemId, table.reviewedAt),
    index("review_event_term_reviewed_at_idx").on(table.termId, table.reviewedAt),
  ],
);

/*
  Cross-pack knowledge state per user and canonical term.
*/
export const userTermState = pgTable(
  "user_term_state",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    termId: text("term_id")
      .notNull()
      .references(() => vocabularyTerm.id, { onDelete: "cascade" }),
    state: userTermStateEnum("state").default("unseen").notNull(),
    source: text("source").default("derived").notNull(),
    totalReviews: integer("total_reviews").default(0).notNull(),
    totalLapses: integer("total_lapses").default(0).notNull(),
    lastPackItemId: text("last_pack_item_id").references(() => packItem.id, {
      onDelete: "set null",
    }),
    firstSeenAt: timestamp("first_seen_at"),
    lastSeenAt: timestamp("last_seen_at"),
    lastReviewedAt: timestamp("last_reviewed_at"),
    knownAt: timestamp("known_at"),
    ignoredAt: timestamp("ignored_at"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.termId], name: "user_term_state_pkey" }),
    index("user_term_state_user_state_idx").on(table.userId, table.state),
  ],
);

/*
  Persisted streak snapshot.
  This is derived from review history, but materializing it keeps reminder logic simple.
*/
export const userStreak = pgTable("user_streak", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  currentStreakDays: integer("current_streak_days").default(0).notNull(),
  longestStreakDays: integer("longest_streak_days").default(0).notNull(),
  lastStudyAt: timestamp("last_study_at"),
  streakStartedAt: timestamp("streak_started_at"),
  ...auditColumns,
});

/*
  Minimal notification model for in-app notifications now and delivery tracking later.
*/
export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    channel: notificationChannelEnum("channel").default("in_app").notNull(),
    status: notificationStatusEnum("status").default("queued").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    payload: jsonb("payload").$type<NotificationPayload>(),
    scheduledFor: timestamp("scheduled_for"),
    sentAt: timestamp("sent_at"),
    readAt: timestamp("read_at"),
    dismissedAt: timestamp("dismissed_at"),
    ...auditColumns,
  },
  (table) => [
    index("notification_user_status_idx").on(table.userId, table.status),
    index("notification_user_type_idx").on(table.userId, table.type),
  ],
);
